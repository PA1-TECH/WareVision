'use client';
import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const REPORT_TABS = [
  { key: 'daily', label: 'Daily Consumption' },
  { key: 'weekly', label: 'Weekly Consumption' },
  { key: 'monthly', label: 'Monthly Consumption' },
  { key: 'inventory', label: 'Inventory Report' },
  { key: 'damaged', label: 'Damaged Items' },
  { key: 'storage', label: 'Storage Utilization' },
  { key: 'lowstock', label: 'Low Stock Report' },
];

export default function Reports({ reportsData }) {
  const [activeReport, setActiveReport] = useState('daily');

  const {
    dailyConsumption = [],
    weeklyConsumption = [],
    monthlyConsumption = [],
    inventoryReport = [],
    damagedReport = [],
    storageUtilizationReport = [],
    lowStockReport = [],
  } = reportsData || {};

  const getActiveData = () => {
    switch (activeReport) {
      case 'daily':   return { data: dailyConsumption,          columns: consumptionColumns };
      case 'weekly':  return { data: weeklyConsumption,         columns: consumptionColumns };
      case 'monthly': return { data: monthlyConsumption,        columns: consumptionColumns };
      case 'inventory': return { data: inventoryReport,         columns: inventoryColumns };
      case 'damaged': return { data: damagedReport,             columns: damagedColumns };
      case 'storage': return { data: storageUtilizationReport,  columns: storageColumns };
      case 'lowstock': return { data: lowStockReport,           columns: lowStockColumns };
      default:        return { data: [],                        columns: [] };
    }
  };

  // Column definitions
  const consumptionColumns = [
    { key: 'id',               label: 'Log ID' },
    { key: 'date',             label: 'Date' },
    { key: 'itemName',         label: 'Item Name' },
    { key: 'quantityTaken',    label: 'Qty Taken' },
    { key: 'remainingQuantity',label: 'Remaining Qty' },
    { key: 'remarks',          label: 'Remarks' },
  ];

  const inventoryColumns = [
    { key: 'id',                  label: 'Item ID' },
    { key: 'name',                label: 'Item Name' },
    { key: 'category',            label: 'Category' },
    { key: 'unit',                label: 'Unit' },
    { key: 'quantity',            label: 'Qty Available' },
    { key: 'minThreshold',        label: 'Min Threshold' },
    { key: 'allocatedQuantity',   label: 'Allocated Qty' },
    { key: 'unallocatedQuantity', label: 'Unallocated Qty' },
    { key: 'status',              label: 'Stock Status' },
  ];

  const damagedColumns = [
    { key: 'id',       label: 'Log ID' },
    { key: 'date',     label: 'Date' },
    { key: 'itemName', label: 'Item Name' },
    { key: 'quantity', label: 'Qty Damaged' },
    { key: 'reason',   label: 'Reason' },
  ];

  const storageColumns = [
    { key: 'id',                   label: 'Location ID' },
    { key: 'capacity',             label: 'Capacity' },
    { key: 'currentUsage',         label: 'Used' },
    { key: 'utilizationPercentage',label: 'Utilization %' },
    { key: 'status',               label: 'Status' },
    { key: 'itemsCount',           label: 'Items Stored' },
  ];

  const lowStockColumns = [
    { key: 'id',           label: 'Item ID' },
    { key: 'name',         label: 'Item Name' },
    { key: 'category',     label: 'Category' },
    { key: 'unit',         label: 'Unit' },
    { key: 'quantity',     label: 'Current Qty' },
    { key: 'minThreshold', label: 'Min Threshold' },
  ];

  // Export to Excel
  const exportExcel = () => {
    const { data, columns } = getActiveData();
    if (!data.length) return alert('No data to export.');

    const ws_data = [
      columns.map(c => c.label),
      ...data.map(row => columns.map(c => row[c.key] ?? ''))
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeReport);
    XLSX.writeFile(wb, `WareVision_${activeReport}_report.xlsx`);
  };

  // Export to PDF
  const exportPDF = () => {
    const { data, columns } = getActiveData();
    if (!data.length) return alert('No data to export.');

    const doc = new jsPDF({ orientation: 'landscape' });
    const tab = REPORT_TABS.find(t => t.key === activeReport);

    doc.setFontSize(16);
    doc.text(`WareVision – ${tab?.label || 'Report'}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);

    doc.autoTable({
      startY: 28,
      head: [columns.map(c => c.label)],
      body: data.map(row => columns.map(c => String(row[c.key] ?? ''))),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [88, 86, 214] },
      alternateRowStyles: { fillColor: [245, 245, 255] },
    });

    doc.save(`WareVision_${activeReport}_report.pdf`);
  };

  const { data, columns } = getActiveData();
  const tab = REPORT_TABS.find(t => t.key === activeReport);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Report Tabs */}
      <div className="report-selector-bar">
        {REPORT_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveReport(t.key)}
            className={`report-tab-btn${activeReport === t.key ? ' active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Report Table */}
      <div className="table-container">
        <div className="table-header-bar">
          <div className="table-title">{tab?.label}</div>
          <div className="table-filters">
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {data.length} record{data.length !== 1 ? 's' : ''}
            </span>
            <button onClick={exportExcel} className="btn btn-secondary" style={{ gap: '6px' }}>
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel
            </button>
            <button onClick={exportPDF} className="btn btn-secondary" style={{ gap: '6px' }}>
              <FileText className="w-4 h-4 text-rose-400" /> Export PDF
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(c => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={i}>
                    {columns.map(c => {
                      const val = row[c.key];
                      // Colour-code status fields
                      if (c.key === 'status') {
                        const cls = val === 'Low Stock' ? 'badge-red'
                          : val === 'Active' ? 'badge-green'
                          : 'badge-black';
                        return (
                          <td key={c.key}>
                            <span className={`badge ${cls}`}>{val}</span>
                          </td>
                        );
                      }
                      if (c.key === 'utilizationPercentage') {
                        const pct = Number(val);
                        const cls = pct > 90 ? 'badge-red' : pct > 70 ? 'badge-yellow' : 'badge-green';
                        return (
                          <td key={c.key}>
                            <span className={`badge ${cls}`}>{pct}%</span>
                          </td>
                        );
                      }
                      return <td key={c.key}>{val ?? '—'}</td>;
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No records found for this report period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
