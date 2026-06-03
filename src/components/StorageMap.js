import React, { useState } from 'react';
import { X, Box, Info, ShieldAlert } from 'lucide-react';

export default function StorageMap({ layout, locations }) {
  const [selectedBlock, setSelectedBlock] = useState(null);

  const handleBlockClick = (loc) => {
    // We can open the popup for any block, even disabled ones (to show status)
    const utilization = loc.capacity > 0 ? Math.round((loc.currentUsage / loc.capacity) * 100) : 0;
    setSelectedBlock({
      ...loc,
      utilization,
      available: Math.max(0, loc.capacity - loc.currentUsage)
    });
  };

  const getBlockColorClass = (loc) => {
    if (loc.status !== 'Active') return 'black';
    const utilization = loc.capacity > 0 ? (loc.currentUsage / loc.capacity) * 100 : 0;
    if (utilization > 90) return 'red';
    if (utilization > 70) return 'yellow';
    return 'green';
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }} className="warehouse-visualizer-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>Interactive Storage Block Map</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Warehouse: <strong>{layout?.warehouseName || 'Central Hub'}</strong> ({layout?.rows} Rows x {layout?.columns} Columns)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-green" style={{ textTransform: 'none' }}>0-70% Used</span>
          <span className="badge badge-yellow" style={{ textTransform: 'none' }}>71-90% Used</span>
          <span className="badge badge-red" style={{ textTransform: 'none' }}>91-100% Used</span>
          <span className="badge badge-black" style={{ textTransform: 'none' }}>Disabled/Damaged</span>
        </div>
      </div>

      {/* Main Grid Map */}
      <div 
        className="warehouse-visual-grid"
        style={{
          gridTemplateColumns: `repeat(${layout?.columns || 3}, 90px)`,
        }}
      >
        {locations.map((loc) => {
          const colorClass = getBlockColorClass(loc);
          const utilization = loc.capacity > 0 ? Math.round((loc.currentUsage / loc.capacity) * 100) : 0;
          return (
            <div
              key={loc.id}
              className={`storage-block ${colorClass}`}
              onClick={() => handleBlockClick(loc)}
            >
              <span className="storage-block-id">{loc.id}</span>
              <span className="storage-block-usage">
                {loc.status === 'Active' ? `${utilization}%` : loc.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend and instructions */}
      <div className="visualization-legend">
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          * Click on any storage block above to view capacity details, usage levels, and the list of allocated items.
        </span>
      </div>

      {/* Block Information Modal Popup */}
      {selectedBlock && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{
              borderBottom: '1px solid var(--border-color)',
              background: selectedBlock.status !== 'Active' 
                ? 'rgba(75, 85, 99, 0.15)' 
                : selectedBlock.utilization > 90 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box className="w-5 h-5 text-indigo-400" />
                <h3 className="modal-title">Block {selectedBlock.id} Specifications</h3>
              </div>
              <button className="modal-close" onClick={() => setSelectedBlock(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Status Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Physical Status:</span>
                  <span className={`badge badge-${getBlockColorClass(selectedBlock)}`}>
                    {selectedBlock.status}
                  </span>
                </div>

                {/* Capacity Summary Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Max Capacity</span>
                    <strong style={{ fontSize: '18px', color: '#ffffff' }}>{selectedBlock.capacity}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Utilization</span>
                    <strong style={{ fontSize: '18px', color: selectedBlock.utilization > 90 ? 'var(--color-red)' : 'var(--text-primary)' }}>
                      {selectedBlock.utilization}%
                    </strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Used Space</span>
                    <strong style={{ fontSize: '18px', color: '#ffffff' }}>{selectedBlock.currentUsage}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Free Space</span>
                    <strong style={{ fontSize: '18px', color: 'var(--color-green)' }}>{selectedBlock.available}</strong>
                  </div>
                </div>

                {/* Stored Items Section */}
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info className="w-4 h-4" /> Allocated Inventory Items
                  </h4>
                  {selectedBlock.allocatedItems && selectedBlock.allocatedItems.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedBlock.allocatedItems.map((item, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          fontSize: '13px'
                        }}>
                          <span style={{ fontWeight: '500' }}>{item.itemName}</span>
                          <strong style={{ color: 'var(--accent)' }}>{item.quantity}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: 'var(--text-muted)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      No items currently allocated in this block.
                    </div>
                  )}
                </div>

              </div>
            </div>
            
            <div className="modal-footer" style={{ padding: '12px 20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedBlock(null)}>Close View</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
