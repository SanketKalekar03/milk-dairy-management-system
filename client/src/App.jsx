import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const today = new Date().toISOString().slice(0, 10);

async function request(path, options) {
  const response = await fetch(`${API}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [records, setRecords] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [form, setForm] = useState({ customerId: '', milkType: 'Cow', quantity: '', rate: '', date: today });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [dbStatus, setDbStatus] = useState('checking');

  async function refresh() {
    setLoading(true);
    try {
      const [customerList, recordList, statusInfo] = await Promise.all([
        request('/customers'),
        request('/records'),
        request('/status').catch(() => ({ database: 'offline' })),
      ]);
      setCustomers(customerList);
      setRecords(recordList);
      setDbStatus(statusInfo.database || 'online');
      setForm((current) => ({
        ...current,
        customerId: current.customerId || customerList[0]?._id || '',
      }));
    } catch (error) {
      setMessage(`Server error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addCustomer(event) {
    event.preventDefault();
    const trimmed = customerName.trim();
    if (!trimmed) return;

    setSubmittingCustomer(true);
    try {
      const customer = await request('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      });
      setCustomers((current) => {
        const next = [...current.filter((c) => c._id !== customer._id), customer];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setForm((current) => ({ ...current, customerId: customer._id }));
      setCustomerName('');
      setMessage(`✓ Customer "${customer.name}" registered successfully!`);
    } catch (error) {
      setMessage(`Failed to add customer: ${error.message}`);
    } finally {
      setSubmittingCustomer(false);
    }
  }

  async function addRecord(event) {
    event.preventDefault();
    try {
      const savedRecord = await request('/records', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          rate: Number(form.rate),
        }),
      });
      setForm((current) => ({ ...current, quantity: '', rate: '' }));
      setMessage(`✓ Collection recorded: ${savedRecord.quantity}L ${savedRecord.milkType} milk = ₹${savedRecord.totalAmount}`);
      await refresh();
    } catch (error) {
      setMessage(`Failed to record: ${error.message}`);
    }
  }

  const totalLitres = records.reduce((sum, record) => sum + (record.quantity || 0), 0);
  const totalAmount = records.reduce((sum, record) => sum + (record.totalAmount || 0), 0);
  const calculated = (Number(form.quantity) || 0) * (Number(form.rate) || 0);

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">M</span>
          <span>
            Meadow Dairy<small>COLLECTION MANAGEMENT</small>
          </span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span className="live">
            <i style={{ background: dbStatus === 'connected' ? '#2e7d32' : '#2e7d32' }} />
            {dbStatus === 'connected' ? 'Atlas Connected' : 'Server Online'}
          </span>
        </div>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow">DAILY OPERATIONS</p>
          <h1>Milk collection</h1>
          <p className="subhead">Add a customer, record today’s collection, and keep every entry in one place.</p>
        </div>
        <div className="date-pill">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </section>

      {message && (
        <div
          role="status"
          style={{
            background: message.startsWith('✓') ? '#e8f5e9' : '#fff3e0',
            color: message.startsWith('✓') ? '#2e7d32' : '#d84315',
            border: `1px solid ${message.startsWith('✓') ? '#c8e6c9' : '#ffe0b2'}`,
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '18px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{message}</span>
          <button
            onClick={() => setMessage('')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: 'inherit',
            }}
          >
            ×
          </button>
        </div>
      )}

      <section className="stats" aria-label="Collection summary">
        <article className="stat">
          <span className="stat-icon green">◎</span>
          <div>
            <span className="stat-label">Customers</span>
            <strong>{customers.length}</strong>
            <small>registered</small>
          </div>
        </article>
        <article className="stat">
          <span className="stat-icon amber">◉</span>
          <div>
            <span className="stat-label">Milk collected</span>
            <strong>
              {totalLitres.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <em> L</em>
            </strong>
            <small>all records</small>
          </div>
        </article>
        <article className="stat">
          <span className="stat-icon blue">₹</span>
          <div>
            <span className="stat-label">Total amount</span>
            <strong>₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            <small>all records</small>
          </div>
        </article>
      </section>

      <section className="workspace">
        <div className="forms-column">
          <article className="panel">
            <div className="panel-heading">
              <span className="step">01</span>
              <div>
                <h2>Add a customer</h2>
                <p>Register a customer for milk collection.</p>
              </div>
            </div>
            <form onSubmit={addCustomer} className="customer-form">
              <label>
                Customer name
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rohit Patil"
                />
              </label>
              <button className="secondary-button" type="submit" disabled={submittingCustomer}>
                {submittingCustomer ? 'Adding…' : 'Add customer'} <span>＋</span>
              </button>
            </form>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <span className="step">02</span>
              <div>
                <h2>Record milk collection</h2>
                <p>Enter the customer’s daily milk details.</p>
              </div>
            </div>
            <form onSubmit={addRecord} className="record-form">
              <label className="wide">
                Customer
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                >
                  <option value="" disabled>
                    Select a customer
                  </option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Milk type
                <select
                  value={form.milkType}
                  onChange={(e) => setForm({ ...form, milkType: e.target.value })}
                >
                  <option value="Cow">Cow milk</option>
                  <option value="Buffalo">Buffalo milk</option>
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label>
                Quantity <span className="unit">litres</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0.00"
                />
              </label>
              <label>
                Rate <span className="unit">per litre</span>
                <div className="currency-input">
                  <span>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </label>
              <div className="amount wide">
                <span>
                  <small>TOTAL AMOUNT</small>
                  <strong>₹{calculated.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </span>
                <small>Quantity × rate per litre</small>
              </div>
              <button
                className="primary-button wide"
                type="submit"
                disabled={!customers.length}
              >
                Save milk record <span>→</span>
              </button>
              {!customers.length && (
                <p className="hint wide">Add a customer before recording milk collection.</p>
              )}
            </form>
          </article>
        </div>

        <article className="panel records-panel">
          <div className="records-heading">
            <div>
              <p className="eyebrow">COLLECTION LOG</p>
              <h2>Milk records</h2>
            </div>
            <span className="count">
              {records.length} {records.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {loading ? (
            <div className="empty">
              <span>◌</span>
              <p>Loading records…</p>
            </div>
          ) : records.length === 0 ? (
            <div className="empty">
              <span>◷</span>
              <p>No milk records yet.</p>
              <small>Your saved collections will appear here.</small>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <strong>{record.customer?.name || 'Customer'}</strong>
                      </td>
                      <td>
                        <span className={`type ${record.milkType.toLowerCase()}`}>
                          {record.milkType}
                        </span>
                      </td>
                      <td>{record.quantity} L</td>
                      <td className="money">
                        ₹{record.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        {new Date(record.date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <footer>
        <span>Meadow Dairy</span>
        <span>Milk collection management</span>
      </footer>
    </main>
  );
}
