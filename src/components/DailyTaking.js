import React, { useState } from 'react';
import { Calendar, ClipboardList, CheckCircle2, AlertTriangle, User } from 'lucide-react';

export default function DailyTaking({ dailyTakes, items, userRole, refreshData }) {
  const [form, setForm] = useState({
    itemId: '',
    quantityTaken: 0,
    remarks: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [lastSubmission, setLastSubmission] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isReadOnly = userRole === 'Viewer';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;

    const qty = parseInt(form.quantityTaken, 10);
    if (!form.itemId || isNaN(qty) || qty <= 0 || !form.date) {
      setErrorMsg("Please select an item, set a positive quantity, and specify the date.");
      return;
    }

    const item = items.find(i => i.id === form.itemId);
    if (!item) {
      setErrorMsg("Selected item not found.");
      return;
    }

    if (item.quantity < qty) {
      setErrorMsg(`Insufficient stock. The warehouse only has ${item.quantity} ${item.unit} available for "${item.name}".`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setLastSubmission(null);

    try {
      const response = await fetch('/api/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          action: 'take',
          ...form
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to record consumption");
      }

      // Record successful submission for display
      setLastSubmission({
        itemName: item.name,
        available: item.quantity, // Quantity before taking
        taken: qty,
        remaining: item.quantity - qty,
        unit: item.unit
      });

      // Clear input fields (keep date)
      setForm({
        ...form,
        itemId: '',
        quantityTaken: 0,
        remarks: ''
      });

      await refreshData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Form and Success Card */}
        {window.matchMedia('(min-width: 1024px)').matches ? (
          <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
            <DailyTakingForm />
            <DailyTakingHistory />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <DailyTakingForm />
            <DailyTakingHistory />
          </div>
        )}

      </div>
    </div>
  );

  function DailyTakingForm() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Form */}
        <div className="warehouse-visualizer-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Record Daily Consumption</h3>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="takeDate">Date *</label>
              <input
                id="takeDate"
                type="date"
                required
                disabled={isReadOnly}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="takeItem">Item Name *</label>
              <select
                id="takeItem"
                required
                disabled={isReadOnly}
                value={form.itemId}
                onChange={(e) => setForm({ ...form, itemId: e.target.value, quantityTaken: 0 })}
                className="form-control"
              >
                <option value="">-- Choose Item --</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} (Stock: {i.quantity} {i.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="takeQty">Quantity Taken *</label>
              <input
                id="takeQty"
                type="number"
                min="1"
                required
                disabled={isReadOnly || !form.itemId}
                value={form.quantityTaken}
                onChange={(e) => setForm({ ...form, quantityTaken: parseInt(e.target.value, 10) || 0 })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="takeRemarks">Remarks / Purpose</label>
              <input
                id="takeRemarks"
                type="text"
                disabled={isReadOnly}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                className="form-control"
                placeholder="e.g. Office setup, laboratory test, clinic re-stock"
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
                Record Consumption
              </button>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                * Sign in as Entry Operator to submit consumptions.
              </span>
            )}
          </form>
        </div>

        {/* Dynamic Calculation Display */}
        {lastSubmission && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-green)', fontWeight: '700' }}>
              <CheckCircle2 className="w-5 h-5" />
              <span>Deduction Completed!</span>
            </div>
            
            <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>Item Name: <strong>{lastSubmission.itemName}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Available Quantity:</span>
                <span>{lastSubmission.available} {lastSubmission.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Quantity Taken:</span>
                <span style={{ color: 'var(--color-red)', fontWeight: 'bold' }}>- {lastSubmission.taken} {lastSubmission.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: 'bold' }}>
                <span>Remaining Quantity:</span>
                <span style={{ color: 'var(--color-green)' }}>{lastSubmission.remaining} {lastSubmission.unit}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function DailyTakingHistory() {
    return (
      <div className="table-container" style={{ margin: 0 }}>
        <div className="table-header-bar">
          <div className="table-title">Consumption Log History</div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Log ID</th>
              <th style={{ width: '120px' }}>Date</th>
              <th>Item Name</th>
              <th>Quantity Taken</th>
              <th>Remaining Qty</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {dailyTakes && dailyTakes.length > 0 ? (
              [...dailyTakes].reverse().map(take => (
                <tr key={take.id}>
                  <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>{take.id}</td>
                  <td>{take.date}</td>
                  <td style={{ fontWeight: '600', color: '#ffffff' }}>{take.itemName}</td>
                  <td style={{ color: 'var(--color-red)', fontWeight: 'bold' }}>
                    -{take.quantityTaken}
                  </td>
                  <td style={{ color: 'var(--color-green)', fontWeight: '600' }}>
                    {take.remainingQuantity}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {take.remarks || "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  No consumption logs recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
}

// Inline helper for Alert Icon
function AlertCircle(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
