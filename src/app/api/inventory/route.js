import { readDB, writeDB } from '@/lib/db';
import { NextResponse } from 'next/server';

function isViewer(request) {
  const roleHeader = request.headers.get('x-user-role');
  const { searchParams } = new URL(request.url);
  const roleQuery = searchParams.get('role');
  return roleHeader === 'Viewer' || roleQuery === 'Viewer';
}

export async function GET() {
  const db = readDB();
  return NextResponse.json(db.items);
}

export async function POST(request) {
  if (isViewer(request)) {
    return NextResponse.json({ error: "Access Denied: Viewer role is read-only" }, { status: 403 });
  }

  try {
    const { name, category, description, unit, quantity, minThreshold } = await request.json();
    if (!name || !category || !unit) {
      return NextResponse.json({ error: "Name, category, and unit are required fields" }, { status: 400 });
    }

    const db = readDB();
    // Validate category exists
    const categoryExists = db.categories.some(c => c.name.toLowerCase() === category.toLowerCase());
    if (!categoryExists) {
      return NextResponse.json({ error: `Category "${category}" does not exist` }, { status: 400 });
    }

    // Auto-generate ITEM-ID
    // Get numeric part of IDs, find max and increment
    let maxNum = 0;
    db.items.forEach(item => {
      const match = item.id.match(/^ITEM-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const newId = `ITEM-${String(maxNum + 1).padStart(3, '0')}`;

    const newItem = {
      id: newId,
      name,
      category,
      description: description || "",
      unit,
      quantity: Number(quantity) || 0,
      minThreshold: Number(minThreshold) || 0,
      createdDate: new Date().toISOString().split('T')[0]
    };

    db.items.push(newItem);
    writeDB(db);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (isViewer(request)) {
    return NextResponse.json({ error: "Access Denied: Viewer role is read-only" }, { status: 403 });
  }

  try {
    const { id, name, category, description, unit, quantity, minThreshold } = await request.json();
    if (!id || !name || !category || !unit) {
      return NextResponse.json({ error: "Item ID, name, category, and unit are required fields" }, { status: 400 });
    }

    const db = readDB();
    const index = db.items.findIndex(item => item.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const categoryExists = db.categories.some(c => c.name.toLowerCase() === category.toLowerCase());
    if (!categoryExists) {
      return NextResponse.json({ error: `Category "${category}" does not exist` }, { status: 400 });
    }

    const oldItem = db.items[index];
    const updatedItem = {
      ...oldItem,
      name,
      category,
      description: description || "",
      unit,
      quantity: Number(quantity) >= 0 ? Number(quantity) : oldItem.quantity,
      minThreshold: Number(minThreshold) >= 0 ? Number(minThreshold) : oldItem.minThreshold
    };

    db.items[index] = updatedItem;

    // Update the item name inside storage allocations as well if name changed
    if (oldItem.name !== name) {
      db.locations = db.locations.map(loc => {
        if (!loc.allocatedItems) return loc;
        const updatedAllocatedItems = loc.allocatedItems.map(ai => {
          if (ai.itemId === id) {
            return { ...ai, itemName: name };
          }
          return ai;
        });
        return { ...loc, allocatedItems: updatedAllocatedItems };
      });
    }

    writeDB(db);
    return NextResponse.json(updatedItem);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (isViewer(request)) {
    return NextResponse.json({ error: "Access Denied: Viewer role is read-only" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const db = readDB();
    const itemExists = db.items.some(item => item.id === id);
    if (!itemExists) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check if the item is currently allocated anywhere in warehouse storage
    const isAllocated = db.locations.some(loc => 
      loc.allocatedItems && loc.allocatedItems.some(ai => ai.itemId === id && ai.quantity > 0)
    );
    if (isAllocated) {
      return NextResponse.json({ error: "Cannot delete item. It is currently allocated in storage blocks. Deallocate first." }, { status: 400 });
    }

    db.items = db.items.filter(item => item.id !== id);
    writeDB(db);

    return NextResponse.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
