import { readDB, writeDB } from '@/lib/db';
import { NextResponse } from 'next/server';

function isViewer(request) {
  const roleHeader = request.headers.get('x-user-role');
  const { searchParams } = new URL(request.url);
  const roleQuery = searchParams.get('role');
  return roleHeader === 'Viewer' || roleQuery === 'Viewer';
}

export async function POST(request) {
  if (isViewer(request)) {
    return NextResponse.json({ error: "Access Denied: Viewer role is read-only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;
    if (!action) {
      return NextResponse.json({ error: "Action parameter is required" }, { status: 400 });
    }

    const db = readDB();

    switch (action) {
      case 'allocate': {
        const { itemId, locationId, quantity } = body;
        const qty = parseInt(quantity, 10);

        if (!itemId || !locationId || isNaN(qty) || qty < 0) {
          return NextResponse.json({ error: "Item ID, Location ID, and valid non-negative quantity are required" }, { status: 400 });
        }

        const item = db.items.find(i => i.id === itemId);
        if (!item) {
          return NextResponse.json({ error: "Item not found in inventory" }, { status: 404 });
        }

        const location = db.locations.find(l => l.id === locationId);
        if (!location) {
          return NextResponse.json({ error: "Storage location not found" }, { status: 404 });
        }

        if (location.status !== 'Active') {
          return NextResponse.json({ error: "Cannot allocate to a disabled or damaged storage location" }, { status: 400 });
        }

        // Calculate item allocations elsewhere
        let currentAllocationsOfThisItem = 0;
        db.locations.forEach(loc => {
          const alloc = loc.allocatedItems?.find(ai => ai.itemId === itemId);
          if (alloc && loc.id !== locationId) {
            currentAllocationsOfThisItem += alloc.quantity;
          }
        });

        // The total quantity allocated across all blocks must not exceed the item's total stock quantity
        if (currentAllocationsOfThisItem + qty > item.quantity) {
          return NextResponse.json({
            error: `Insufficient stock to allocate. Item "${item.name}" has total stock of ${item.quantity} ${item.unit}. Currently allocated elsewhere: ${currentAllocationsOfThisItem}. Max allowed for this block: ${item.quantity - currentAllocationsOfThisItem}.`
          }, { status: 400 });
        }

        // Capacity check of the block
        // Find existing allocation in this specific block
        const existingAllocIndex = location.allocatedItems.findIndex(ai => ai.itemId === itemId);
        const existingAllocQty = existingAllocIndex !== -1 ? location.allocatedItems[existingAllocIndex].quantity : 0;
        
        const spaceChange = qty - existingAllocQty;
        if (location.currentUsage + spaceChange > location.capacity) {
          return NextResponse.json({
            error: `Exceeds block capacity. Block ${locationId} capacity: ${location.capacity}. Current usage: ${location.currentUsage}. Requested allocation: ${qty} (increase of ${spaceChange}). Available space: ${location.capacity - location.currentUsage + existingAllocQty}.`
          }, { status: 400 });
        }

        // Apply allocation
        if (qty === 0) {
          // Remove from allocation
          location.allocatedItems = location.allocatedItems.filter(ai => ai.itemId !== itemId);
        } else {
          if (existingAllocIndex !== -1) {
            location.allocatedItems[existingAllocIndex].quantity = qty;
          } else {
            location.allocatedItems.push({
              itemId,
              itemName: item.name,
              quantity: qty
            });
          }
        }

        // Recalculate usage
        location.currentUsage = location.allocatedItems.reduce((sum, ai) => sum + ai.quantity, 0);
        writeDB(db);

        return NextResponse.json({
          success: true,
          message: `Allocated ${qty} of ${item.name} to location ${locationId}`,
          location
        });
      }

      case 'move': {
        const { itemId, fromLocationId, toLocationId, quantity } = body;
        const qty = parseInt(quantity, 10);

        if (!itemId || !fromLocationId || !toLocationId || isNaN(qty) || qty <= 0) {
          return NextResponse.json({ error: "Item ID, Source Location, Target Location, and valid positive quantity are required" }, { status: 400 });
        }

        if (fromLocationId === toLocationId) {
          return NextResponse.json({ error: "Source and target locations must be different" }, { status: 400 });
        }

        const item = db.items.find(i => i.id === itemId);
        if (!item) {
          return NextResponse.json({ error: "Item not found in inventory" }, { status: 404 });
        }

        const fromLoc = db.locations.find(l => l.id === fromLocationId);
        const toLoc = db.locations.find(l => l.id === toLocationId);

        if (!fromLoc || !toLoc) {
          return NextResponse.json({ error: "Source or Target location not found" }, { status: 404 });
        }

        if (fromLoc.status !== 'Active' || toLoc.status !== 'Active') {
          return NextResponse.json({ error: "Both source and target locations must be Active" }, { status: 400 });
        }

        const fromAllocIndex = fromLoc.allocatedItems.findIndex(ai => ai.itemId === itemId);
        if (fromAllocIndex === -1 || fromLoc.allocatedItems[fromAllocIndex].quantity < qty) {
          const availableQty = fromAllocIndex !== -1 ? fromLoc.allocatedItems[fromAllocIndex].quantity : 0;
          return NextResponse.json({ error: `Insufficient quantity in source block ${fromLocationId}. Stored: ${availableQty} ${item.unit}. Requested: ${qty}.` }, { status: 400 });
        }

        // Check capacity of target location
        const toAllocIndex = toLoc.allocatedItems.findIndex(ai => ai.itemId === itemId);
        if (toLoc.currentUsage + qty > toLoc.capacity) {
          return NextResponse.json({
            error: `Exceeds target block capacity. Block ${toLocationId} capacity: ${toLoc.capacity}. Current usage: ${toLoc.currentUsage}. Requested move: ${qty}. Available: ${toLoc.capacity - toLoc.currentUsage}.`
          }, { status: 400 });
        }

        // Deduct from source
        fromLoc.allocatedItems[fromAllocIndex].quantity -= qty;
        if (fromLoc.allocatedItems[fromAllocIndex].quantity === 0) {
          fromLoc.allocatedItems = fromLoc.allocatedItems.filter(ai => ai.itemId !== itemId);
        }
        fromLoc.currentUsage = fromLoc.allocatedItems.reduce((sum, ai) => sum + ai.quantity, 0);

        // Add to target
        if (toAllocIndex !== -1) {
          toLoc.allocatedItems[toAllocIndex].quantity += qty;
        } else {
          toLoc.allocatedItems.push({
            itemId,
            itemName: item.name,
            quantity: qty
          });
        }
        toLoc.currentUsage = toLoc.allocatedItems.reduce((sum, ai) => sum + ai.quantity, 0);

        // Track movement history
        let maxMovNum = 0;
        db.movements.forEach(m => {
          const match = m.id.match(/^MOV-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxMovNum) maxMovNum = num;
          }
        });
        const newMovId = `MOV-${String(maxMovNum + 1).padStart(3, '0')}`;
        
        db.movements.push({
          id: newMovId,
          itemId,
          itemName: item.name,
          fromLocation: fromLocationId,
          toLocation: toLocationId,
          quantity: qty,
          date: new Date().toISOString().split('T')[0]
        });

        writeDB(db);

        return NextResponse.json({
          success: true,
          message: `Moved ${qty} of ${item.name} from ${fromLocationId} to ${toLocationId}`,
          fromLocation: fromLoc,
          toLocation: toLoc
        });
      }

      case 'take': {
        const { itemId, quantityTaken, remarks, date } = body;
        const qty = parseInt(quantityTaken, 10);

        if (!itemId || isNaN(qty) || qty <= 0 || !date) {
          return NextResponse.json({ error: "Item ID, Date, and valid positive quantity taken are required" }, { status: 400 });
        }

        const itemIndex = db.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
          return NextResponse.json({ error: "Item not found in inventory" }, { status: 404 });
        }

        const item = db.items[itemIndex];
        if (item.quantity < qty) {
          return NextResponse.json({ error: `Insufficient stock in inventory. Available: ${item.quantity} ${item.unit}. Requested: ${qty}.` }, { status: 400 });
        }

        // Subtract quantity
        item.quantity -= qty;

        // Auto self-healing allocations:
        // If the new stock is less than total allocated quantity, we must reduce the allocations!
        let totalAllocated = db.locations.reduce((sum, loc) => {
          const alloc = loc.allocatedItems?.find(ai => ai.itemId === itemId);
          return sum + (alloc ? alloc.quantity : 0);
        }, 0);

        let excessAllocation = totalAllocated - item.quantity;
        if (excessAllocation > 0) {
          // Reduce allocations starting from location list
          for (let loc of db.locations) {
            if (excessAllocation <= 0) break;
            const allocIndex = loc.allocatedItems.findIndex(ai => ai.itemId === itemId);
            if (allocIndex !== -1) {
              const allocQty = loc.allocatedItems[allocIndex].quantity;
              if (allocQty <= excessAllocation) {
                // Remove entire allocation
                excessAllocation -= allocQty;
                loc.allocatedItems = loc.allocatedItems.filter(ai => ai.itemId !== itemId);
              } else {
                // Reduce partial allocation
                loc.allocatedItems[allocIndex].quantity -= excessAllocation;
                excessAllocation = 0;
              }
              // Update location current usage
              loc.currentUsage = loc.allocatedItems.reduce((sum, ai) => sum + ai.quantity, 0);
            }
          }
        }

        // Log daily consumption take
        let maxTakeNum = 0;
        db.dailyTakes.forEach(t => {
          const match = t.id.match(/^TAKE-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxTakeNum) maxTakeNum = num;
          }
        });
        const newTakeId = `TAKE-${String(maxTakeNum + 1).padStart(3, '0')}`;

        const newTake = {
          id: newTakeId,
          itemId,
          itemName: item.name,
          quantityTaken: qty,
          remainingQuantity: item.quantity,
          date,
          remarks: remarks || ""
        };

        db.dailyTakes.push(newTake);
        writeDB(db);

        return NextResponse.json({
          success: true,
          message: `Recorded consumption of ${qty} ${item.unit} for ${item.name}`,
          item,
          takeRecord: newTake
        });
      }

      case 'damage': {
        const { itemId, quantity, reason, date } = body;
        const qty = parseInt(quantity, 10);

        if (!itemId || isNaN(qty) || qty <= 0 || !reason || !date) {
          return NextResponse.json({ error: "Item ID, Reason, Date, and valid positive quantity are required" }, { status: 400 });
        }

        const itemIndex = db.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
          return NextResponse.json({ error: "Item not found in inventory" }, { status: 404 });
        }

        const item = db.items[itemIndex];
        if (item.quantity < qty) {
          return NextResponse.json({ error: `Insufficient stock in inventory. Available: ${item.quantity} ${item.unit}. Requested: ${qty}.` }, { status: 400 });
        }

        // Subtract quantity from inventory
        item.quantity -= qty;

        // Auto self-healing allocations:
        let totalAllocated = db.locations.reduce((sum, loc) => {
          const alloc = loc.allocatedItems?.find(ai => ai.itemId === itemId);
          return sum + (alloc ? alloc.quantity : 0);
        }, 0);

        let excessAllocation = totalAllocated - item.quantity;
        if (excessAllocation > 0) {
          for (let loc of db.locations) {
            if (excessAllocation <= 0) break;
            const allocIndex = loc.allocatedItems.findIndex(ai => ai.itemId === itemId);
            if (allocIndex !== -1) {
              const allocQty = loc.allocatedItems[allocIndex].quantity;
              if (allocQty <= excessAllocation) {
                excessAllocation -= allocQty;
                loc.allocatedItems = loc.allocatedItems.filter(ai => ai.itemId !== itemId);
              } else {
                loc.allocatedItems[allocIndex].quantity -= excessAllocation;
                excessAllocation = 0;
              }
              loc.currentUsage = loc.allocatedItems.reduce((sum, ai) => sum + ai.quantity, 0);
            }
          }
        }

        // Log damage
        let maxDmgNum = 0;
        db.damagedItems.forEach(d => {
          const match = d.id.match(/^DMG-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxDmgNum) maxDmgNum = num;
          }
        });
        const newDmgId = `DMG-${String(maxDmgNum + 1).padStart(3, '0')}`;

        const newDmg = {
          id: newDmgId,
          itemId,
          itemName: item.name,
          quantity: qty,
          reason,
          date
        };

        db.damagedItems.push(newDmg);
        writeDB(db);

        return NextResponse.json({
          success: true,
          message: `Recorded damage of ${qty} ${item.unit} for ${item.name}`,
          item,
          damageRecord: newDmg
        });
      }

      case 'update-location-status': {
        const { locationId, status } = body;
        if (!locationId || !status) {
          return NextResponse.json({ error: "Location ID and Status are required" }, { status: 400 });
        }

        if (!['Active', 'Disabled', 'Damaged'].includes(status)) {
          return NextResponse.json({ error: "Invalid status value. Must be 'Active', 'Disabled', or 'Damaged'" }, { status: 400 });
        }

        const location = db.locations.find(l => l.id === locationId);
        if (!location) {
          return NextResponse.json({ error: "Storage location not found" }, { status: 404 });
        }

        location.status = status;

        // If status becomes Disabled or Damaged, we can clear allocations
        if (status !== 'Active' && location.allocatedItems && location.allocatedItems.length > 0) {
          // Clear allocations in this location
          location.allocatedItems = [];
          location.currentUsage = 0;
        }

        writeDB(db);

        return NextResponse.json({
          success: true,
          message: `Status of location ${locationId} updated to ${status}`,
          location
        });
      }

      default:
        return NextResponse.json({ error: `Action "${action}" is not recognized` }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
