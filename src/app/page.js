'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Package, Layers, Grid, ClipboardList,
  ShieldAlert, BarChart2, FileText, Map, RefreshCw,
  Warehouse, AlertTriangle, ChevronRight, LogOut
} from 'lucide-react';

import Dashboard    from '@/components/Dashboard';
import Inventory    from '@/components/Inventory';
import Categories   from '@/components/Categories';
import LayoutManager from '@/components/LayoutManager';
import StorageMap   from '@/components/StorageMap';
import DailyTaking  from '@/components/DailyTaking';
import DamagedItems from '@/components/DamagedItems';
import Analytics    from '@/components/Analytics';
import Reports      from '@/components/Reports';

const NAV_ITEMS = [
  { key: 'dashboard',     label: 'Dashboard',          icon: LayoutDashboard },
  { key: 'inventory',     label: 'Inventory',          icon: Package },
  { key: 'categories',    label: 'Categories',         icon: Layers },
  { key: 'layout',        label: 'Layout & Allocation', icon: Grid },
  { key: 'visualization', label: 'Warehouse Map',      icon: Map },
  { key: 'daily',         label: 'Daily Taking',       icon: ClipboardList },
  { key: 'damaged',       label: 'Damaged Items',      icon: ShieldAlert },
  { key: 'analytics',     label: 'Analytics',          icon: BarChart2 },
  { key: 'reports',       label: 'Reports',            icon: FileText },
];

export default function WareVisionApp() {
  const [activeTab, setActiveTab]   = useState('dashboard');
  const [userRole, setUserRole]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [categories,   setCategories]   = useState([]);
  const [items,        setItems]        = useState([]);
  const [locations,    setLocations]    = useState([]);
  const [layout,       setLayout]       = useState(null);
  const [dailyTakes,   setDailyTakes]   = useState([]);
  const [damagedItems, setDamagedItems] = useState([]);
  const [reportsData,  setReportsData]  = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [catRes, invRes, layRes, repRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/inventory'),
        fetch('/api/layout'),
        fetch('/api/reports'),
      ]);

      const [cats, invItems, layData, repData] = await Promise.all([
        catRes.json(),
        invRes.json(),
        layRes.json(),
        repRes.json(),
      ]);

      setCategories(Array.isArray(cats) ? cats : []);
      setItems(Array.isArray(invItems) ? invItems : []);
      setLayout(layData.layout || null);
      setLocations(Array.isArray(layData.locations) ? layData.locations : []);
      setReportsData(repData);

      // Pull daily takes and damaged items directly from db via reports endpoint
      // (they are returned inside reportsData but we also store separately for components)
      // Fetch raw from db via a dedicated simple route or reuse reports endpoint
      // We expose them inside reportsData already; we'll read from there
      setDailyTakes(repData?.dailyConsumption ? [] : []);   // placeholder – components read from reports
      setDamagedItems(repData?.damagedReport ? [] : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  // First load
  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    })();
  }, [fetchAll]);

  // We also need raw dailyTakes and damagedItems for the DailyTaking/DamagedItems forms.
  // Since /api/reports returns weeklyConsumption (last 7 days) we need ALL records.
  // Add a dedicated /api/db-read route, or — simpler — expose via the layout route.
  // We'll use a separate thin fetch for those two.
  const fetchRawLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const { dailyTakes: dt, damagedItems: di } = await res.json();
        setDailyTakes(dt || []);
        setDamagedItems(di || []);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchRawLogs();
  }, [fetchRawLogs]);

  // Redirect Viewer to 'analytics' if they are on an unauthorized tab
  useEffect(() => {
    if (userRole === 'Viewer' && activeTab !== 'analytics' && activeTab !== 'reports') {
      setActiveTab('analytics');
    }
  }, [userRole, activeTab]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAll(), fetchRawLogs()]);
    setRefreshing(false);
  }, [fetchAll, fetchRawLogs]);

  // Low-stock count for the header alert badge
  const lowStockCount = reportsData?.meta?.lowStockCount ?? 0;

  const tabTitle = NAV_ITEMS.find(n => n.key === activeTab)?.label || 'Dashboard';

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-primary)', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px',
          border: '3px solid var(--border-color)',
          borderTop: '3px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading WareVision...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="portal-container">
        <div className="portal-glow" />
        <div className="portal-glow-sec" />
        
        <div className="portal-card">
          <div className="portal-logo-section">
            <div className="portal-logo-icon">
              <Warehouse className="w-8 h-8 text-white" />
            </div>
            <h1 className="portal-title">WareVision</h1>
            <p className="portal-subtitle">
              Intelligent Warehouse Storage Management & Allocation System. Select your access portal below to get started.
            </p>
          </div>
          
          <div className="portal-grid">
            {/* Entry Operator Card */}
            <div 
              className="portal-option-card"
              onClick={() => {
                setUserRole('Entry Operator');
                setActiveTab('dashboard');
              }}
            >
              <div className="portal-option-icon-wrapper">
                <Package className="w-7 h-7 text-indigo-400" />
              </div>
              <h2 className="portal-option-title">Entry Operator Portal</h2>
              <p className="portal-option-desc">
                Full administrative access. Manage inventory items, categorizations, storage block layouts, daily consumption records, and report tracking.
              </p>
              <button className="portal-btn">
                Enter Operator Portal <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Viewer Card */}
            <div 
              className="portal-option-card"
              onClick={() => {
                setUserRole('Viewer');
                setActiveTab('analytics');
              }}
            >
              <div className="portal-option-icon-wrapper">
                <BarChart2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="portal-option-title">Viewer Portal</h2>
              <p className="portal-option-desc">
                Read-only analytics access. Monitor real-time warehouse space utilization statistics, consumption trends, and generate exportable reports.
              </p>
              <button className="portal-btn">
                Enter Viewer Portal <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <Warehouse className="w-5 h-5 text-white" />
          </div>
          <span className="logo-text">WareVision</span>
        </div>

        <ul className="nav-links">
          {NAV_ITEMS.filter(({ key }) => userRole !== 'Viewer' || key === 'analytics' || key === 'reports').map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <button
                className={`nav-link${activeTab === key ? ' active' : ''}`}
                onClick={() => setActiveTab(key)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <Icon className="w-[18px] h-[18px]" />
                {label}
                {key === 'dashboard' && lowStockCount > 0 && (
                  <span className="badge badge-red" style={{ marginLeft: 'auto', padding: '2px 7px', fontSize: '10px' }}>
                    {lowStockCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div className="user-badge" style={{ flexGrow: 1 }}>
            <div className="user-avatar">
              <span style={{ fontSize: '14px', color: '#fff' }}>
                {userRole === 'Entry Operator' ? 'EO' : 'VW'}
              </span>
            </div>
            <div className="user-info">
              <span className="user-name">{userRole}</span>
              <span className="user-role-label">
                {userRole === 'Viewer' ? 'Read-only access' : 'Full access'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setUserRole(null)} 
            className="btn btn-secondary" 
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'none' }}
            title="Switch Portal / Exit"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-title-section">
            <h1 className="header-title">{tabTitle}</h1>
          </div>

          <div className="header-actions">
            {/* Low-stock badge */}
            {lowStockCount > 0 && userRole !== 'Viewer' && (
              <button
                className="low-stock-panel"
                onClick={() => setActiveTab('dashboard')}
              >
                <AlertTriangle className="w-4 h-4" style={{ marginRight: '6px' }} />
                {lowStockCount} Low Stock Alert{lowStockCount > 1 ? 's' : ''}
              </button>
            )}

            {/* Refresh button */}
            <button
              onClick={refreshData}
              className="btn btn-secondary"
              style={{ padding: '8px', borderRadius: '8px' }}
              title="Refresh all data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="content-body">
          {activeTab === 'dashboard' && (
            <Dashboard reportsData={reportsData} setActiveTab={setActiveTab} />
          )}

          {activeTab === 'inventory' && (
            <Inventory
              items={items}
              categories={categories}
              locations={locations}
              userRole={userRole}
              refreshData={refreshData}
            />
          )}

          {activeTab === 'categories' && (
            <Categories
              categories={categories}
              items={items}
              userRole={userRole}
              refreshData={refreshData}
            />
          )}

          {activeTab === 'layout' && (
            <LayoutManager
              layout={layout}
              locations={locations}
              items={items}
              userRole={userRole}
              refreshData={refreshData}
            />
          )}

          {activeTab === 'visualization' && (
            <StorageMap layout={layout} locations={locations} />
          )}

          {activeTab === 'daily' && (
            <DailyTaking
              dailyTakes={dailyTakes}
              items={items}
              userRole={userRole}
              refreshData={refreshData}
            />
          )}

          {activeTab === 'damaged' && (
            <DamagedItems
              damagedItems={damagedItems}
              items={items}
              userRole={userRole}
              refreshData={refreshData}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics
              items={items}
              locations={locations}
              dailyTakes={dailyTakes}
            />
          )}

          {activeTab === 'reports' && (
            <Reports reportsData={reportsData} />
          )}
        </main>
      </div>
    </div>
  );
}
