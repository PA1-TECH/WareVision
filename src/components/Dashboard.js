import React from 'react';
import { Package, Layers, Grid, AlertTriangle, Trash2, Percent, ArrowRight } from 'lucide-react';

export default function Dashboard({ reportsData, setActiveTab }) {
  const { meta, lowStockReport } = reportsData || {
    meta: {
      totalItems: 0,
      totalCategories: 0,
      totalLocations: 0,
      lowStockCount: 0,
      damagedCount: 0,
      storageUtilizationPercent: 0
    },
    lowStockReport: []
  };

  const statCards = [
    {
      label: "Total Items",
      value: meta.totalItems,
      icon: <Package className="w-6 h-6 text-indigo-400" />,
      colorClass: "indigo"
    },
    {
      label: "Total Categories",
      value: meta.totalCategories,
      icon: <Layers className="w-6 h-6 text-purple-400" />,
      colorClass: "purple"
    },
    {
      label: "Storage Locations",
      value: meta.totalLocations,
      icon: <Grid className="w-6 h-6 text-blue-400" />,
      colorClass: "blue"
    },
    {
      label: "Low Stock Items",
      value: meta.lowStockCount,
      icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
      colorClass: "amber",
      warning: meta.lowStockCount > 0
    },
    {
      label: "Damaged Items Qty",
      value: meta.damagedCount,
      icon: <Trash2 className="w-6 h-6 text-rose-400" />,
      colorClass: "rose"
    },
    {
      label: "Storage Utilization",
      value: `${meta.storageUtilizationPercent}%`,
      icon: <Percent className="w-6 h-6 text-emerald-400" />,
      colorClass: "emerald"
    }
  ];

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Metric Cards Grid */}
      <div className="dashboard-grid">
        {statCards.map((card, i) => (
          <div 
            key={i} 
            className="stat-card"
            style={{
              borderColor: card.warning ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)',
              boxShadow: card.warning ? '0 4px 20px rgba(245, 158, 11, 0.1)' : 'var(--shadow-sm)'
            }}
          >
            <div className="stat-info">
              <span className="stat-label">{card.label}</span>
              <span className="stat-value">{card.value}</span>
            </div>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Low Stock Alerts Section */}
      <div className="low-stock-alert-banner">
        <div className="alert-banner-header">
          <AlertTriangle className="w-5 h-5" />
          <span>Critical Low Stock Alerts</span>
          <span 
            className="badge badge-red" 
            style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '10px' }}
          >
            {meta.lowStockCount} Items Low
          </span>
        </div>
        
        {lowStockReport && lowStockReport.length > 0 ? (
          <div className="alert-banner-items">
            {lowStockReport.map(item => (
              <div key={item.id} className="alert-banner-item">
                <div>
                  <span className="alert-banner-item-name">{item.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '12px' }}>
                    ID: {item.id} | Category: {item.category}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span className="alert-banner-item-qty">
                    Qty: {item.quantity} {item.unit} (Min Threshold: {item.minThreshold})
                  </span>
                  <button 
                    onClick={() => setActiveTab('inventory')}
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', gap: '4px' }}
                  >
                    Restock <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--color-green)', fontWeight: '600', fontSize: '14px' }}>
            ✓ All inventory items are above their minimum stock thresholds. No low stock items detected.
          </div>
        )}
      </div>

      {/* Quick Visual Snapshot Intro Card */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginTop: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Interactive Warehouse Visualization Map</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Monitor real-time storage allocations, check utilization percentages of space blocks, and view item layouts.
          </p>
        </div>
        <button 
          onClick={() => setActiveTab('visualization')}
          className="btn btn-primary"
        >
          Open Visualizer Map
        </button>
      </div>
    </div>
  );
}
