import { readDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const db = readDB();
    const now = new Date();

    // Helper for date filtering
    const getDaysAgo = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d;
    };

    const oneDayAgo = getDaysAgo(1);
    const sevenDaysAgo = getDaysAgo(7);
    const thirtyDaysAgo = getDaysAgo(30);

    // 1. Daily Consumption (Takes from last 24h or grouped by date)
    const dailyConsumption = db.dailyTakes.filter(take => {
      const takeDate = new Date(take.date);
      return takeDate >= oneDayAgo;
    });

    // 2. Weekly Consumption (Takes from last 7 days)
    const weeklyConsumption = db.dailyTakes.filter(take => {
      const takeDate = new Date(take.date);
      return takeDate >= sevenDaysAgo;
    });

    // 3. Monthly Consumption (Takes from last 30 days)
    const monthlyConsumption = db.dailyTakes.filter(take => {
      const takeDate = new Date(take.date);
      return takeDate >= thirtyDaysAgo;
    });

    // 4. Inventory Report (Items with calculation metrics)
    const inventoryReport = db.items.map(item => {
      // Calculate total allocated quantity for this item
      const allocatedQty = db.locations.reduce((sum, loc) => {
        const alloc = loc.allocatedItems?.find(ai => ai.itemId === item.id);
        return sum + (alloc ? alloc.quantity : 0);
      }, 0);

      return {
        ...item,
        allocatedQuantity: allocatedQty,
        unallocatedQuantity: Math.max(0, item.quantity - allocatedQty),
        status: item.quantity <= item.minThreshold ? "Low Stock" : "Sufficient"
      };
    });

    // 5. Damaged Items Report
    const damagedReport = db.damagedItems;

    // 6. Storage Utilization Report
    const storageUtilizationReport = db.locations.map(loc => {
      const utilizationPercent = loc.capacity > 0 ? Math.round((loc.currentUsage / loc.capacity) * 100) : 0;
      
      // Determine color state based on rules:
      // Green: 0-70%, Yellow: 71-90%, Red: 91-100%, Black: Disabled/Damaged
      let colorClass = "green";
      if (loc.status !== 'Active') {
        colorClass = "black";
      } else if (utilizationPercent > 90) {
        colorClass = "red";
      } else if (utilizationPercent > 70) {
        colorClass = "yellow";
      }

      return {
        ...loc,
        utilizationPercentage: utilizationPercent,
        colorClass,
        itemsCount: loc.allocatedItems ? loc.allocatedItems.length : 0
      };
    });

    // 7. Low Stock Report
    const lowStockReport = db.items.filter(item => item.quantity <= item.minThreshold);

    return NextResponse.json({
      dailyConsumption,
      weeklyConsumption,
      monthlyConsumption,
      inventoryReport,
      damagedReport,
      storageUtilizationReport,
      lowStockReport,
      meta: {
        compiledAt: now.toISOString(),
        totalItems: db.items.length,
        totalCategories: db.categories.length,
        totalLocations: db.locations.length,
        lowStockCount: lowStockReport.length,
        damagedCount: db.damagedItems.reduce((sum, d) => sum + d.quantity, 0),
        storageUtilizationPercent: calculateWarehouseUtilization(db.locations)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateWarehouseUtilization(locations) {
  if (locations.length === 0) return 0;
  const activeLocations = locations.filter(l => l.status === 'Active');
  if (activeLocations.length === 0) return 0;

  const totalCapacity = activeLocations.reduce((sum, l) => sum + l.capacity, 0);
  const totalUsage = activeLocations.reduce((sum, l) => sum + l.currentUsage, 0);
  
  return totalCapacity > 0 ? Math.round((totalUsage / totalCapacity) * 100) : 0;
}
