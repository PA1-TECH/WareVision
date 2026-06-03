import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';

export default function Categories({ categories, items, userRole, refreshData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [currentCategory, setCurrentCategory] = useState({ id: '', name: '', description: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isReadOnly = userRole === 'Viewer';

  // Search filter
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    if (isReadOnly) return;
    setCurrentCategory({ id: '', name: '', description: '' });
    setModalMode('add');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    if (isReadOnly) return;
    setCurrentCategory({ ...cat });
    setModalMode('edit');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!currentCategory.name.trim()) {
      setErrorMsg("Category name is required.");
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const url = '/api/categories';
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(currentCategory)
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to save category");
      }

      setShowModal(false);
      await refreshData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (isReadOnly) return;
    
    // Check if category is used by items
    const isAssigned = items.some(item => item.category.toLowerCase() === name.toLowerCase());
    if (isAssigned) {
      alert(`Cannot delete category "${name}" because it is currently assigned to items in your inventory. Reassign or delete those items first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the category "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole
        }
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to delete category");
      }
      await refreshData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="table-container">
        <div className="table-header-bar">
          <div className="table-title">Categories Directory</div>
          
          <div className="table-filters">
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search className="w-4 h-4 text-gray-400" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            {/* Add Button - Hidden for Viewer */}
            {!isReadOnly && (
              <button onClick={openAddModal} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Add Category
              </button>
            )}
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '120px' }}>Category ID</th>
              <th style={{ width: '220px' }}>Category Name</th>
              <th>Description</th>
              <th style={{ width: '150px' }}>Items Count</th>
              {!isReadOnly && <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => {
                const count = items.filter(item => item.category.toLowerCase() === cat.name.toLowerCase()).length;
                return (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{cat.id}</td>
                    <td style={{ fontWeight: '600', color: '#ffffff' }}>{cat.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{cat.description || "—"}</td>
                    <td>
                      <span className="badge badge-green" style={{ fontSize: '12px' }}>
                        {count} items
                      </span>
                    </td>
                    {!isReadOnly && (
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button 
                            onClick={() => openEditModal(cat)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Edit Category"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat.id, cat.name)} 
                            className="btn btn-danger" 
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Delete Category"
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
                <td colSpan={isReadOnly ? 4 : 5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Category Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{modalMode === 'add' ? 'Create New Category' : 'Edit Category Details'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ color: 'var(--color-red)', fontSize: '13px', padding: '10px', backgroundColor: 'var(--color-red-light)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', marginBottom: '16px' }}>
                    {errorMsg}
                  </div>
                )}
                
                <div className="form-group">
                  <label htmlFor="catName">Category Name *</label>
                  <input
                    id="catName"
                    type="text"
                    required
                    value={currentCategory.name}
                    onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                    className="form-control"
                    placeholder="e.g. Chemicals, Stationery, Electronics"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="catDesc">Description</label>
                  <textarea
                    id="catDesc"
                    rows={4}
                    value={currentCategory.description}
                    onChange={(e) => setCurrentCategory({ ...currentCategory, description: e.target.value })}
                    className="form-control"
                    placeholder="Describe the storage rules, safety hazards, or types of materials included in this category..."
                    style={{ resize: 'none' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : modalMode === 'add' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
