import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'db.json');

// Helper to ensure db.json structure is correct
function ensureDbExists() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({
      categories: [],
      items: [],
      layout: { warehouseName: "Default Warehouse", rows: 3, columns: 3 },
      locations: [],
      dailyTakes: [],
      damagedItems: [],
      movements: []
    }, null, 2));
  }
}

export function readDB() {
  ensureDbExists();
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return {
      categories: [],
      items: [],
      layout: { warehouseName: "Default Warehouse", rows: 3, columns: 3 },
      locations: [],
      dailyTakes: [],
      damagedItems: [],
      movements: []
    };
  }
}

export function writeDB(data) {
  ensureDbExists();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}
