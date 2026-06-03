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
  return NextResponse.json({
    layout: db.layout,
    locations: db.locations
  });
}

export async function POST(request) {
  if (isViewer(request)) {
    return NextResponse.json({ error: "Access Denied: Viewer role is read-only" }, { status: 403 });
  }

  try {
    const { warehouseName, rows, columns, defaultCapacity } = await request.json();
    
    const r = parseInt(rows, 10);
    const c = parseInt(columns, 10);
    const cap = parseInt(defaultCapacity, 10) || 100;

    if (!warehouseName || isNaN(r) || isNaN(c) || r <= 0 || c <= 0) {
      return NextResponse.json({ error: "Warehouse name, valid positive rows and columns are required" }, { status: 400 });
    }

    if (r > 26) {
      return NextResponse.json({ error: "Maximum number of rows is 26" }, { status: 400 });
    }

    const db = readDB();
    
    // Generate new locations list
    const newLocations = [];
    for (let i = 0; i < r; i++) {
      const rowLabel = String.fromCharCode(65 + i); // 65 is 'A'
      for (let j = 1; j <= c; j++) {
        const locationId = `${rowLabel}${j}`;
        newLocations.push({
          id: locationId,
          capacity: cap,
          currentUsage: 0,
          status: "Active", // "Active", "Disabled", "Damaged"
          allocatedItems: []
        });
      }
    }

    // Update layout metadata and locations
    db.layout = { warehouseName, rows: r, columns: c };
    db.locations = newLocations;

    // Reset movements because location IDs have changed
    db.movements = [];
    
    writeDB(db);

    return NextResponse.json({
      success: true,
      message: "Warehouse layout generated successfully",
      layout: db.layout,
      locations: db.locations
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
