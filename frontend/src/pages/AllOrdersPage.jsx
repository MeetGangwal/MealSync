import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge } from '../components/Shared';
import {
  Search, ChevronDown, ChevronUp, Download, CheckCircle,
  Clock, AlertTriangle, XCircle, ArrowRight,
} from 'lucide-react';

export default function AllOrdersPage() {
  const { orders, updateOrderStatus } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [transitioning, setTransitioning] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const statusFilters = [
    { key: 'all', label: 'All Orders' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PREPARING', label: 'Preparing' },
    { key: 'READY', label: 'Ready for Pickup' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  const filtered = orders.filter(o => {
    const status = (o.status || '').toUpperCase();
    const matchStatus = filter === 'all' || status === filter;
    const matchSearch = !search.trim() ||
      (o.id && o.id.toLowerCase().includes(search.toLowerCase())) ||
      (o.studentName && o.studentName.toLowerCase().includes(search.toLowerCase())) ||
      (o.slotLabel && o.slotLabel.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const handleStatusChange = async (orderId, targetStatus) => {
    setTransitioning(orderId);
    setErrorMsg('');
    const res = await updateOrderStatus(orderId, targetStatus);
    setTransitioning(null);
    if (res?.error) {
      setErrorMsg(res.error);
    }
  };

  const exportCSV = () => {
    const headers = ['Order ID', 'Student Name', 'Total (INR)', 'Pickup Slot', 'Status', 'Date/Time'];
    const rows = filtered.map(o => [
      o.id,
      `"${o.studentName || 'Student'}"`,
      o.total,
      `"${o.slotLabel || ''}"`,
      o.status,
      `"${o.createdAt || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mealsync_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <SectionHeader
        title="Kitchen Order Operations"
        subtitle={`Live orders for the single campus counter • ${orders.length} total orders recorded`}
        actions={
          <button className="btn btn-ghost" onClick={exportCSV}>
            <Download size={16} /> Export Orders CSV
          </button>
        }
      />

      {errorMsg && (
        <div className="alert alert-danger mb-md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMsg}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setErrorMsg('')}>✕</button>
        </div>
      )}

      {/* Search & Status Filter Bar */}
      <div className="flex gap-md mb-lg flex-wrap items-center">
        <div className="search-bar" style={{ flex: 1, minWidth: 260 }}>
          <Search size={16} className="search-icon" />
          <input
            placeholder="Search by Order ID (e.g. MS10290) or student name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="tab-list" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {statusFilters.map(f => {
            const count = f.key === 'all'
              ? orders.length
              : orders.filter(o => (o.status || '').toUpperCase() === f.key).length;

            return (
              <div
                key={f.key}
                className={`tab-item ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="badge badge-muted" style={{ marginLeft: 6, fontSize: '0.7rem' }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📋</div>
          <h3 className="heading-md mb-xs">No orders match criteria</h3>
          <p className="body-sm text-muted">Try switching status filters or clearing the search bar.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Student</th>
                <th>Items Summary</th>
                <th>Total</th>
                <th>Pickup Slot</th>
                <th>Status</th>
                <th>Next Transition</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const isExp = expanded === o.id;
                const st = (o.status || '').toUpperCase();
                const isLoading = transitioning === o.id;

                return (
                  <tr key={o.id} style={{ borderBottom: isExp ? 'none' : '1px solid var(--border-subtle)' }}>
                    <td style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>{o.id}</td>
                    <td>
                      <div className="font-bold">{o.studentName || 'Student'}</div>
                      <div className="caption text-muted">{o.studentEmail}</div>
                    </td>
                    <td className="truncate" style={{ maxWidth: 220 }}>
                      {(o.items || []).map(i => `${i.name}×${i.qty}`).join(', ')}
                    </td>
                    <td className="heading-sm text-success">₹{o.total}</td>
                    <td>📍 {o.slotLabel}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>
                      {/* State Machine Transition Actions */}
                      {st === 'CONFIRMED' && (
                        <div className="flex gap-xs">
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={isLoading}
                            onClick={() => handleStatusChange(o.id, 'PREPARING')}
                          >
                            {isLoading ? '…' : 'Start Prep'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            disabled={isLoading}
                            onClick={() => handleStatusChange(o.id, 'CANCELLED')}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {st === 'PREPARING' && (
                        <div className="flex gap-xs">
                          <button
                            className="btn btn-warning btn-sm"
                            disabled={isLoading}
                            onClick={() => handleStatusChange(o.id, 'READY')}
                          >
                            {isLoading ? '…' : 'Mark Ready'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            disabled={isLoading}
                            onClick={() => handleStatusChange(o.id, 'CANCELLED')}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {st === 'READY' && (
                        <button
                          className="btn btn-success btn-sm"
                          disabled={isLoading}
                          onClick={() => handleStatusChange(o.id, 'COMPLETED')}
                        >
                          {isLoading ? '…' : 'Mark Collected'}
                        </button>
                      )}
                      {st === 'COMPLETED' && (
                        <span className="caption text-success font-bold flex items-center gap-xs">
                          <CheckCircle size={14} /> Collected
                        </span>
                      )}
                      {st === 'CANCELLED' && (
                        <span className="caption text-danger font-bold flex items-center gap-xs">
                          <XCircle size={14} /> Restocked
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => setExpanded(isExp ? null : o.id)}
                        title="Toggle Order Details"
                      >
                        {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expanded Order Detail Drawer */}
      {expanded && (
        <div className="modal-overlay" onClick={() => setExpanded(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            {(() => {
              const order = orders.find(o => o.id === expanded);
              if (!order) return null;

              return (
                <div>
                  <div className="modal-header">
                    <div>
                      <h3 className="heading-lg">Order #{order.id}</h3>
                      <div className="caption text-muted">Customer: {order.studentName} ({order.studentEmail})</div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => setExpanded(null)}>✕</button>
                  </div>
                  <div className="modal-body">
                    <div className="card-glass mb-md" style={{ padding: 'var(--space-md)' }}>
                      <div className="flex justify-between items-center mb-xs">
                        <span className="label text-muted">Pickup Window</span>
                        <span className="label text-brand">📍 {order.slotLabel}</span>
                      </div>
                      <div className="flex justify-between items-center mb-xs">
                        <span className="label text-muted">Current Status</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="label text-muted">Payment Verification</span>
                        <span className="label text-success">Verified Server-Side</span>
                      </div>
                    </div>

                    <div className="form-label mb-sm">Ordered Items</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'var(--space-md)' }}>
                      {(order.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center"
                          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}
                        >
                          <div className="flex items-center gap-sm">
                            <span style={{ fontSize: '1.25rem' }}>{item.emoji || '🍽️'}</span>
                            <div>
                              <div className="label">{item.name}</div>
                              <div className="caption text-muted">Qty: {item.qty}</div>
                            </div>
                          </div>
                          <span className="label text-brand">₹{item.price * item.qty}</span>
                        </div>
                      ))}
                    </div>

                    <div className="divider" style={{ margin: '12px 0' }} />
                    <div className="flex justify-between items-center">
                      <span className="heading-md">Total Amount</span>
                      <span className="heading-lg text-success">₹{order.total}</span>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => setExpanded(null)}>Close</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
