import React, { useState } from 'react';
import { Settings, RefreshCw, AlertCircle, Move, HelpCircle, ToggleLeft } from 'lucide-react';

export default function LayoutManager({ layout, locations, items, userRole, refreshData }) {
  const [form, setForm] = useState({
    warehouseName: layout?.warehouseName || 'Central Hub',
    rows: layout?.rows || 3,
    columns: layout?.columns || 3,
    defaultCapacity: 100
  });

  const [moveForm, setMoveForm] = useState({
    itemId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: 0
  });

  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [statusVal, setStatusVal] = useState('Active');

  const [errorMsg, setErrorMsg] = useState('');
  const [moveErrorMsg, setMoveErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [moveLoading, setMoveLoading] = useState(false);
  
  const isReadOnly = userRole === 'Viewer';

  const handleLayoutSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!confirm("WARNING: Generating a new layout will clear all existing storage block allocations and location status data. The inventory item ledger counts will remain intact, but physical layout mappings will be completely reset. Do you wish to continue?")) {
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(form)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to update layout");
      }

      await refreshData();
      alert("Warehouse layout updated successfully!");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly || !selectedLocationId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          action: 'update-location-status',
          locationId: selectedLocationId,
          status: statusVal
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to update status");
      }

      await refreshData();
      setSelectedLocationId('');
      alert(`Updated block ${selectedLocationId} status to ${statusVal}!`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    const qty = parseInt(moveForm.quantity, 10);
    if (!moveForm.itemId || !moveForm.fromLocationId || !moveForm.toLocationId || isNaN(qty) || qty <= 0) {
      setMoveErrorMsg("Please fill out all fields with valid values.");
      return;
    }

    setMoveLoading(true);
    setMoveErrorMsg('');

    try {
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          action: 'move',
          ...moveForm
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to move inventory");
      }

      setMoveForm({ itemId: '', fromLocationId: '', toLocationId: '', quantity: 0 });
      await refreshData();
      alert("Inventory relocated successfully!");
    } catch (err) {
      setMoveErrorMsg(err.message);
    } finally {
      setMoveLoading(false);
    }
  };

  // When source location changes, get items stored there
  const getSourceLocationItems = () => {
    if (!moveForm.fromLocationId) return [];
    const loc = locations.find(l => l.id === moveForm.fromLocationId);
    return loc?.allocatedItems || [];
  };

  return (
    <div className="layout-editor-section" style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* Configuration Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Dynamic Layout Form */}
        <div className="warehouse-visualizer-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Reconfigure Layout</h3>
          </div>

          <form onSubmit={handleLayoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Warehouse Name</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={form.warehouseName}
                onChange={(e) => setForm({ ...form, warehouseName: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Rows (Max 26)</label>
                <input
                  type="number"
                  min="1"
                  max="26"
                  disabled={isReadOnly}
                  value={form.rows}
                  onChange={(e) => setForm({ ...form, rows: parseInt(e.target.value, 10) || 1 })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Columns</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  disabled={isReadOnly}
                  value={form.columns}
                  onChange={(e) => setForm({ ...form, columns: parseInt(e.target.value, 10) || 1 })}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Default Capacity per Block</label>
              <input
                type="number"
                min="10"
                disabled={isReadOnly}
                value={form.defaultCapacity}
                onChange={(e) => setForm({ ...form, defaultCapacity: parseInt(e.target.value, 10) || 100 })}
                className="form-control"
              />
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--color-red)', fontSize: '12px', display: 'flex', gap: '6px' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isReadOnly ? (
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Generate Layout
              </button>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                * Log in as Entry Operator to modify layouts.
              </span>
            )}
          </form>
        </div>

        {/* Toggle Block Status Form */}
        <div className="warehouse-visualizer-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <ToggleLeft className="w-5 h-5 text-purple-400" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Block Status Editor</h3>
          </div>

          <form onSubmit={handleStatusSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Select Storage Location</label>
              <select
                disabled={isReadOnly}
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  const loc = locations.find(l => l.id === e.target.value);
                  if (loc) setStatusVal(loc.status);
                }}
                className="form-control"
              >
                <option value="">-- Choose Block --</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    Block {l.id} ({l.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedLocationId && (
              <>
                <div className="form-group">
                  <label>Update Status</label>
                  <select
                    disabled={isReadOnly}
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="form-control"
                  >
                    <option value="Active">Active (Green/Yellow/Red)</option>
                    <option value="Disabled">Disabled (Black - allocations cleared)</option>
                    <option value="Damaged">Damaged (Black - allocations cleared)</option>
                  </select>
                </div>

                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#f87171' }}>
                  ⚠️ Changing status to Disabled or Damaged will automatically wipe out any current item allocations stored in that block!
                </div>

                {!isReadOnly && (
                  <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
                    Update Status
                  </button>
                )}
              </>
            )}
          </form>
        </div>
      </div>

      {/* Relocate Inventory Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Relocate Inventory Form */}
        <div className="warehouse-visualizer-card" style={{ height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <Move className="w-5 h-5 text-emerald-400" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Relocate Inventory Stock</h3>
          </div>

          <form onSubmit={handleMoveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ display: 'flex', flexSpread: 'column', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Source Block Location *</label>
                <select
                  disabled={isReadOnly}
                  value={moveForm.fromLocationId}
                  onChange={(e) => setMoveForm({ ...moveForm, fromLocationId: e.target.value, itemId: '', quantity: 0 })}
                  className="form-control"
                >
                  <option value="">-- Select Source Block --</option>
                  {locations.filter(l => l.allocatedItems && l.allocatedItems.length > 0 && l.status === 'Active').map(l => (
                    <option key={l.id} value={l.id}>
                      Block {l.id} ({l.allocatedItems.length} items stored)
                    </option>
                  ))}
                </select>
              </div>

              {moveForm.fromLocationId && (
                <>
                  <div className="form-group">
                    <label>Select Item to Move *</label>
                    <select
                      disabled={isReadOnly}
                      value={moveForm.itemId}
                      onChange={(e) => setMoveForm({ ...moveForm, itemId: e.target.value, quantity: 0 })}
                      className="form-control"
                    >
                      <option value="">-- Choose Stored Item --</option>
                      {getSourceLocationItems().map(ai => (
                        <option key={ai.itemId} value={ai.itemId}>
                          {ai.itemName} (Available: {ai.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  {moveForm.itemId && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Target Location *</label>
                          <select
                            disabled={isReadOnly}
                            value={moveForm.toLocationId}
                            onChange={(e) => setMoveForm({ ...moveForm, toLocationId: e.target.value })}
                            className="form-control"
                          >
                            <option value="">-- Select Target --</option>
                            {locations
                              .filter(l => l.id !== moveForm.fromLocationId && l.status === 'Active')
                              .map(l => {
                                const space = l.capacity - l.currentUsage;
                                return (
                                  <option key={l.id} value={l.id}>
                                    Block {l.id} (Free Space: {space})
                                  </option>
                                );
                              })}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Move Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            max={getSourceLocationItems().find(ai => ai.itemId === moveForm.itemId)?.quantity || 1}
                            disabled={isReadOnly}
                            value={moveForm.quantity}
                            onChange={(e) => setMoveForm({ ...moveForm, quantity: parseInt(e.target.value, 10) || 0 })}
                            className="form-control"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {moveErrorMsg && (
                <div style={{ color: 'var(--color-red)', fontSize: '12px', display: 'flex', gap: '6px' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{moveErrorMsg}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              {!isReadOnly ? (
                moveForm.toLocationId && moveForm.quantity > 0 && (
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={moveLoading}>
                    Relocate Items
                  </button>
                )
              ) : (
                <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  * Relocations are restricted for Viewers.
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
