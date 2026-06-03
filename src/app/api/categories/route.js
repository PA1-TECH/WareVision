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
  return NextResponse.json(db.categories);
}

export async function POST(request) {
  if (isViewer(request)) {
    return NextResponse.json({ error: "Access Denied: Viewer role is read-only" }, { status: 403 });
  }

  try {
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const db = readDB();
    // Check if category already exists
    const exists = db.categories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 400 });
    }

    const newId = `CAT-${String(db.categories.length + 1).padStart(3, '0')}`;
    const newCategory = { id: newId, name, description: description || "" };
    
    db.categories.push(newCategory);
    writeDB(db);

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (isViewer(request)) {
    return NextResponse.json({ error: "Access Denied: Viewer role is read-only" }, { status: 403 });
  }

  try {
    const { id, name, description } = await request.json();
    if (!id || !name) {
      return NextResponse.json({ error: "Category ID and name are required" }, { status: 400 });
    }

    const db = readDB();
    const index = db.categories.findIndex(c => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if new name conflicts with another category
    const conflicts = db.categories.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase());
    if (conflicts) {
      return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 400 });
    }

    db.categories[index] = { ...db.categories[index], name, description };
    writeDB(db);

    return NextResponse.json(db.categories[index]);
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
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const db = readDB();
    const category = db.categories.find(c => c.id === id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Check if category is used by any inventory items
    const isUsed = db.items.some(item => item.category.toLowerCase() === category.name.toLowerCase());
    if (isUsed) {
      return NextResponse.json({ error: "Cannot delete category as it is currently assigned to items in inventory" }, { status: 400 });
    }

    db.categories = db.categories.filter(c => c.id !== id);
    writeDB(db);

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
