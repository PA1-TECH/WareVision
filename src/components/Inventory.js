import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, ShieldAlert, X, MapPin } from 'lucide-react';

export default function Inventory({ items, categories, locations, userRole, refreshData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Low Stock', 'Sufficient'
  
  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalMode, setItemModalMode] = useState('add'); // 'add' or 'edit'
  const [currentItem, setCurrentItem] = useState({
    id: '', name: '', category: '', description: '', unit: '', quantity: 0, minThreshold: 0
  });

  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocationForm, setAllocationForm] = useState({ itemId: '', itemName: '', locationId: '', quantity: 0 });

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isReadOnly = userRole === 'Viewer';

  // Filters
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || item.category.toLowerCase() === categoryFilter.toLowerCase();
    
    const isLowStock = item.quantity <= item.minThreshold;
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'Low Stock' && isLowStock) || 
                          (statusFilter === 'Sufficient' && !isLowStock);
                          
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const openAddModal = () => {
    if (isReadOnly) return;
    setCurrentItem({
      id: '',
      name: '',
      category: categories.length > 0 ? categories[0].name : '',
      description: '',
      unit: 'pcs',
      quantity: 0,
      minThreshold: 5
    });
    setItemModalMode('add');
    setErrorMsg('');
    setShowItemModal(true);
  };

  const openEditModal = (item) => {
    if (isReadOnly) return;
    setCurrentItem({ ...item });
    setItemModalMode('edit');
    setErrorMsg('');
    setShowItemModal(true);
  };

  const openAllocateModal = (item) => {
    if (isReadOnly) return;
    
    // Find current allocated quantity for this item in a particular block if selected
    setAllocationForm({
      itemId: item.id,
      itemName: item.name,
      locationId: locations.length > 0 ? locations[0].id : '',
      quantity: 0
    });
    setErrorMsg('');
    setShowAllocateModal(true);
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!currentItem.name.trim() || !currentItem.category || !currentItem.unit) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const url = '/api/inventory';
      const method = itemModalMode === 'add' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(currentItem)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to save item");
      }

      setShowItemModal(false);
      await refreshData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    const qty = parseInt(allocationForm.quantity, 10);
    if (!allocationForm.locationId || isNaN(qty) || qty < 0) {
      setErrorMsg("A valid storage location and non-negative quantity are required.");
      return;
    }

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
          action: 'allocate',
          itemId: allocationForm.itemId,
          locationId: allocationForm.locationId,
          quantity: qty
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to allocate item");
      }

      setShowAllocateModal(false);
      await refreshData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (isReadOnly) return;

    // First check if the item is allocated anywhere
    const isAllocated = locations.some(loc => 
      loc.allocatedItems && loc.allocatedItems.some(ai => ai.itemId === id && ai.quantity > 0)
    );
    if (isAllocated) {
      alert(`Cannot delete item "${name}" because it is currently allocated in storage blocks. Please set its allocation quantity to 0 first in the layout manager or allocate modal.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the item "${name}" from inventory?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/inventory?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole
        }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to delete item");
      }
      await refreshData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Find allocation count/sum for rendering in table
  const getItemAllocations = (itemId) => {
    const list = [];
    locations.forEach(loc => {
      const alloc = loc.allocatedItems?.find(ai => ai.itemId === itemId);
      if (alloc && alloc.quantity > 0) {
        list.push({ locationId: loc.id, quantity: alloc.quantity });
      }
    });
    return list;
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="table-container">
        <div className="table-header-bar">
          <div className="table-title">Inventory Ledger</div>
          
          <div className="table-filters">
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search className="w-4 h-4 text-gray-400" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                placeholder="Search name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            {/* Category Filter */}
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-filter"
            >
              <option value="All">All Stocks</option>
              <option value="Low Stock">⚠️ Low Stock Alerts</option>
              <option value="Sufficient">✓ Sufficient Stock</option>
            </select>

            {/* Add Button - Hidden for Viewer */}
            {!isReadOnly && (
              <button onClick={openAddModal} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            )}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Item ID</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Qty Available</th>
              <th>Allocated Blocks</th>
              <th>Status</th>
              {!isReadOnly && <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const isLow = item.quantity <= item.minThreshold;
                const allocations = getItemAllocations(item.id);
                const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{item.id}</td>
                    <td>
                      <div style={{ fontWeight: '600', color: '#ffffff' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description || "No description provided"}
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td>{item.unit}</td>
                    <td style={{ fontWeight: '700' }}>
                      <span style={{ color: isLow ? 'var(--color-red)' : 'var(--text-primary)' }}>
                        {item.quantity}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        (min: {item.minThreshold})
                      </span>
                    </td>
                    <td>
                      {allocations.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Allocated: <strong>{totalAllocated}</strong>
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {allocations.map(a => (
                              <span key={a.locationId} className="badge badge-green" style={{ fontSize: '10px', textTransform: 'none', padding: '2px 6px' }}>
                                {a.locationId} ({a.quantity})
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Unallocated</span>
                      )}
                    </td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-red" style={{ gap: '4px', display: 'inline-flex', alignItems: 'center' }}>
                          <ShieldAlert className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="badge badge-green">In Stock</span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button 
                            onClick={() => openAllocateModal(item)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', gap: '4px' }}
                            title="Allocate to Storage Grid"
                          >
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Allocate
                          </button>
                          <button 
                            onClick={() => openEditModal(item)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Edit Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id, item.name)} 
                            className="btn btn-danger" 
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isReadOnly ? 7 : 8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No inventory items match the current search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Item Modal (Add/Edit) */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{itemModalMode === 'add' ? 'Register New Inventory Item' : 'Modify Item Ledger Details'}</h3>
              <button className="modal-close" onClick={() => setShowItemModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleItemSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ color: 'var(--color-red)', fontSize: '13px', padding: '10px', backgroundColor: 'var(--color-red-light)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', marginBottom: '16px' }}>
                    {errorMsg}
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="itemName">Item Name *</label>
                  <input
                    id="itemName"
                    type="text"
                    required
                    value={currentItem.name}
                    onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                    className="form-control"
                    placeholder="e.g. LED Monitor 24in, Steel Bolt M8"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="itemCategory">Category *</label>
                    <select
                      id="itemCategory"
                      value={currentItem.category}
                      onChange={(e) => setCurrentItem({ ...currentItem, category: e.target.value })}
                      className="form-control"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="itemUnit">Unit of Measure *</label>
                    <input
                      id="itemUnit"
                      type="text"
                      required
                      value={currentItem.unit}
                      onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                      className="form-control"
                      placeholder="e.g. pcs, boxes, litres, reams"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="itemQuantity">Available Stock Quantity *</label>
                    <input
                      id="itemQuantity"
                      type="number"
                      min="0"
                      required
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value, 10) || 0 })}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="itemThreshold">Minimum Alert Threshold *</label>
                    <input
                      id="itemThreshold"
                      type="number"
                      min="0"
                      required
                      value={currentItem.minThreshold}
                      onChange={(e) => setCurrentItem({ ...currentItem, minThreshold: parseInt(e.target.value, 10) || 0 })}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="itemDesc">Item Description</label>
                  <textarea
                    id="itemDesc"
                    rows={3}
                    value={currentItem.description}
                    onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                    className="form-control"
                    placeholder="Provide storage recommendations, specifications, safety alerts, or model details..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : itemModalMode === 'add' ? 'Register Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Allocate to Storage Block</h3>
              <button className="modal-close" onClick={() => setShowAllocateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAllocateSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ color: 'var(--color-red)', fontSize: '13px', padding: '10px', backgroundColor: 'var(--color-red-light)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', marginBottom: '16px' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Item selected:</span>
                  <strong style={{ display: 'block', fontSize: '15px', color: '#ffffff', marginTop: '4px' }}>
                    [{allocationForm.itemId}] {allocationForm.itemName}
                  </strong>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Available stock to allocate: {items.find(i => i.id === allocationForm.itemId)?.quantity || 0} {items.find(i => i.id === allocationForm.itemId)?.unit}
                  </span>
                </div>

                <div className="form-row" style={{ marginTop: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="allocLocation">Target Block Location *</label>
                    <select
                      id="allocLocation"
                      value={allocationForm.locationId}
                      onChange={(e) => setAllocationForm({ ...allocationForm, locationId: e.target.value })}
                      className="form-control"
                    >
                      {locations.filter(l => l.status === 'Active').map(l => {
                        const available = l.capacity - l.currentUsage;
                        return (
                          <option key={l.id} value={l.id}>
                            Block {l.id} (Free Space: {available} / Cap: {l.capacity})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="allocQty">Quantity to Allocate *</label>
                    <input
                      id="allocQty"
                      type="number"
                      min="0"
                      required
                      value={allocationForm.quantity}
                      onChange={(e) => setAllocationForm({ ...allocationForm, quantity: parseInt(e.target.value, 10) || 0 })}
                      className="form-control"
                    />
                  </div>
                </div>

                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  * Setting allocation quantity to 0 will remove this item from the block. Total allocated items cannot exceed the item's total stock or the block's physical capacity.
                </span>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Apply Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
