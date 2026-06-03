import React, { useState } from 'react';
import { ShieldAlert, Trash2, Clipboard, HeartCrack } from 'lucide-react';

export default function DamagedItems({ damagedItems, items, userRole, refreshData }) {
  const [form, setForm] = useState({
    itemId: '',
    quantity: 0,
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isReadOnly = userRole === 'Viewer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    const qty = parseInt(form.quantity, 10);
    if (!form.itemId || isNaN(qty) || qty <= 0 || !form.reason.trim() || !form.date) {
      setErrorMsg("Please fill out all fields correctly.");
      return;
    }

    const item = items.find(i => i.id === form.itemId);
    if (!item) {
      setErrorMsg("Selected item not found.");
      return;
    }

    if (item.quantity < qty) {
      setErrorMsg(`Cannot mark more items as damaged than are available in stock. Stock: ${item.quantity} ${item.unit}.`);
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
          action: 'damage',
          ...form
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to log damaged items");
      }

      setForm({
        ...form,
        itemId: '',
        quantity: 0,
        reason: ''
      });

      await refreshData();
      alert("Damaged item reported and stock updated!");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {window.matchMedia('(min-width: 1024px)').matches ? (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
          <DamagedForm />
          <DamagedHistory />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <DamagedForm />
          <DamagedHistory />
        </div>
      )}

    </div>
  );

  function DamagedForm() {
    return (
      <div className="warehouse-visualizer-card" style={{ height: 'fit-content' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <HeartCrack className="w-5 h-5 text-rose-400" />
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Report Damaged Stock</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <div className="form-group">
            <label htmlFor="damageDate">Date *</label>
            <input
              id="damageDate"
              type="date"
              required
              disabled={isReadOnly}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="damageItem">Select Affected Item *</label>
            <select
              id="damageItem"
              required
              disabled={isReadOnly}
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value, quantity: 0 })}
              className="form-control"
            >
              <option value="">-- Select Item --</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name} (Available: {i.quantity} {i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="damageQty">Damaged Quantity *</label>
            <input
              id="damageQty"
              type="number"
              min="1"
              required
              disabled={isReadOnly || !form.itemId}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value, 10) || 0 })}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="damageReason">Damage Reason / Notes *</label>
            <input
              id="damageReason"
              type="text"
              required
              disabled={isReadOnly}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="form-control"
              placeholder="e.g. Water leak, forklift crash, broken packaging"
            />
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--color-red)', fontSize: '12px', display: 'flex', gap: '6px' }}>
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!isReadOnly ? (
            <button type="submit" className="btn btn-danger" style={{ justifyContent: 'center' }}>
              Mark Damaged Qty
            </button>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              * Sign in as Entry Operator to submit damage reports.
            </span>
          )}
        </form>
      </div>
    );
  }

  function DamagedHistory() {
    return (
      <div className="table-container" style={{ margin: 0 }}>
        <div className="table-header-bar">
          <div className="table-title">Damaged Inventory Log</div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Log ID</th>
              <th style={{ width: '120px' }}>Date</th>
              <th>Item Name</th>
              <th>Quantity Damaged</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {damagedItems && damagedItems.length > 0 ? (
              [...damagedItems].reverse().map(dmg => (
                <tr key={dmg.id}>
                  <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{dmg.id}</td>
                  <td>{dmg.date}</td>
                  <td style={{ fontWeight: '600', color: '#ffffff' }}>{dmg.itemName}</td>
                  <td style={{ color: 'var(--color-red)', fontWeight: 'bold' }}>
                    {dmg.quantity}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {dmg.reason}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No damaged stock records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
}
