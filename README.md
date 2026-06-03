# 🏢 WareVision

> **Intelligent Warehouse Storage Management, Space Allocation & Visualization System**

WareVision is a modern, high-performance web application designed to optimize warehouse storage space, track real-time inventory levels, visualize physical storage layouts, and generate actionable analytics. Built with a sleek glassmorphic dark theme, it delivers an intuitive experience for both operators and managers.

---

## 🚀 Key Features

### 1. 🗺️ Interactive Warehouse Visualization Map
* **Real-Time Layouts:** Visual block-by-block grid representing the physical warehouse layout.
* **Smart Utilization Color Coding:**
  * 🟢 **Green (0% - 70%):** Optimal space available.
  * 🟡 **Yellow (71% - 90%):** Reaching warning capacity.
  * 🔴 **Red (91% - 100%):** Critical capacity / fully allocated space.
  * ⚫ **Black:** Disabled or damaged storage block (restricted from allocations).
* **Hover Details:** View current item allocations and precise usage statistics instantly.

### 2. 👥 Portal Access Modes (Role-Based Workspace)
The workspace splits into two distinct, optimized environments:
* **Entry Operator Portal (Full Access):**
  * Manage inventory quantities, unit specifications, and min stock thresholds.
  * Allocate inventory items to specific storage blocks.
  * Update physical storage block statuses (Active, Disabled, Damaged).
  * Record daily consumption takes and damaged stock items.
* **Viewer Portal (Read-Only):**
  * Focused, analytics-driven layout restricted to monitoring graphs and exporting data.
  * Full dashboard view with interactive charts showing consumption trends, inventory distribution, and space utilization.

### 3. 📊 Analytics & Reporting Suite
* **Interactive Graphs:** Dynamic charts tracking Daily Consumption Trends, Monthly Consumption Comparisons, Category-wise Distributions, and Block Utilization.
* **Export Utilities:** Instant PDF reports and Excel spreadsheets generation for inventory statuses and logs.
* **Low Stock Alerts:** Automated warnings when items drop below their defined minimum thresholds.

---

## 🛠️ Technology Stack

* **Frontend Framework:** Next.js (utilizing Turbopack) & React
* **Styling System:** Custom Vanilla CSS with modern CSS variables, responsive design, glassmorphism, and neon glowing elements
* **Icons Library:** Lucide React
* **Database System:** Lightweight local JSON Database with transactional read/write utilities
* **Libraries:** 
  * `chart.js` & `react-chartjs-2` for rich visualization graphics
  * `jspdf` & `jspdf-autotable` for PDF exports
  * `xlsx` for Excel spreadsheet compiles
  * `html2canvas` for visual map snapshots

---

## ⚙️ Getting Started & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or later recommended)
* npm (comes bundled with Node.js)

### Installation Steps

1. **Clone or Extract the Project:**
   Ensure all files are placed in your project directory.

2. **Navigate into the Project Folder:**
   ```bash
   cd WareVision
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Launch the Development Server:**
   ```bash
   npm run dev
   ```

5. **Open in Browser:**
   Once compiled, navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 📂 Project Directory Structure

```text
WareVision/
├── data/
│   └── db.json               # Local JSON database (inventory, allocations, logs)
├── public/                   # Static assets & favicon
└── src/
    ├── app/
    │   ├── api/              # RESTful API Route Handlers (inventory, layouts, transactions)
    │   ├── globals.css       # Core global style guidelines & animations stylesheet
    │   ├── layout.js         # Next.js root layout wrapper
    │   └── page.js           # Core landing portal & layout manager page
    ├── components/           # Modularized UI Components
    │   ├── Analytics.js      # Graphical charts rendering
    │   ├── Categories.js     # Category management panel
    │   ├── DailyTaking.js    # Log sheet for daily consumption
    │   ├── DamagedItems.js   # Log sheet for damaged stock
    │   ├── Dashboard.js      # Quick statistics grid & alerts panel
    │   ├── Inventory.js      # Central inventory registry table
    │   ├── LayoutManager.js  # Storage block allocations editor
    │   ├── Reports.js        # Export center and compiled data logs
    │   └── StorageMap.js     # Storage visualization grid
    └── lib/
        └── db.js             # Local filesystem database helpers (read/write sync)
```

---

## 📄 License
This project is proprietary. All rights reserved.
