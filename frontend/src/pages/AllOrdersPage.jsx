import { useState, useEffect, useCallback } from 'react';
import { Search, Download, RefreshCw, Eye, XCircle, ChefHat, Bell, PackageCheck, Inbox } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge, Modal, ConfirmDialog, Spinner, EmptyState } from '../components/Shared';
import { counterFor } from '../components/MenuCatalog';
import { formatDateTime } from '../lib/format';

// Allowed transitions mirror AdminController.VALID_TRANSITIONS; the server enforces them.
const NEXT = {
  CONFIRMED: { to: 'PREPARING', label: 'Start preparing', icon: ChefHat },
  PREPARING: { to: 'READY', label: 'Mark ready', icon: Bell },
  READY: { to: 'COMPLETED', label: 'Hand over', icon: PackageCheck },
};
const COLUMNS = [
  { key: 'CONFIRMED', title: 'New', hint: 'Waiting to be started' },
  { key: 'PREPARING', title: 'Preparing', hint: 'In the kitchen' },
  { key: 'READY', title: 'Ready', hint: 'Waiting for the student' },
];
const COUNTERS = [
  { key: 'all', label: 'All counters' },
  { key: 'Thali counter', label: 'Thali counter' },
  { key: 'Other dishes counter', label: 'Other dishes' },
];

const upper = (s) => String(s || '').toUpperCase();
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Counter order queue for mess staff (administrators). Status changes apply to the whole order. */
export default function AllOrdersPage() {
  const { orders, fetchOrders, updateOrderStatus, showToast } = useApp();
  const [view, setView] = useState('queue');
  const [counter, setCounter] = useState('all');
  const [search, setSearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    await fetchOrders();
    setLastUpdated(new Date());
    if (!quiet) setRefreshing(false);
  }, [fetchOrders]);

  // Quiet refresh every 20 s while the tab is visible; it never touches filters or open dialogs
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(true); }, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  const q = search.trim().toLowerCase();
  const matchesSearch = (o) => !q || [o.id, o.studentName, o.studentEmail, o.slotLabel].some(v => String(v || '').toLowerCase().includes(q));
  const itemsForCounter = (o) => (counter === 'all' ? o.items : o.items.filter(i => counterFor(i.category) === counter));
  const inCounter = (o) => itemsForCounter(o).length > 0;

  const queue = orders.filter(o => NEXT[upper(o.status)] && inCounter(o) && matchesSearch(o))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))); // oldest first: serve in order
  const history = orders.filter(o => inCounter(o) && matchesSearch(o) && (historyStatus === 'all' || upper(o.status) === historyStatus));

  const advance = async (order) => {
    const next = NEXT[upper(order.status)];
    if (!next) return;
    setBusyId(order.id);
    const res = await updateOrderStatus(order.id, next.to);
    setBusyId(null);
    if (res?.error) showToast(`${order.id}: ${res.error}`, 'danger');
    else showToast(`${order.id} ${next.to === 'COMPLETED' ? 'handed over' : `moved to ${next.to.toLowerCase()}`}.`);
  };

  const confirmCancel = async () => {
    const order = toCancel;
    const res = await updateOrderStatus(order.id, 'CANCELLED');
    if (res?.error) showToast(`${order.id}: ${res.error}`, 'danger');
    else showToast(`${order.id} cancelled and its stock restored.`);
    setToCancel(null);
    setDetail(null);
  };

  const exportCSV = () => {
    const headers = ['Order', 'Customer', 'Email', 'Items', 'Total (INR)', 'Payment', 'Pickup slot', 'Status', 'Placed'];
    const rows = history.map(o => [o.id, o.studentName, o.studentEmail, o.items.map(i => `${i.qty} x ${i.name}`).join('; '),
      o.total, o.paymentStatus, o.slotLabel, o.status, o.createdAt]);
    const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `mealsync-orders-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const detailOrder = detail ? orders.find(o => o.id === detail) : null;

  return (
    <div>
      <SectionHeader
        title="Order queue"
        subtitle="Move each order through preparation and hand-over. Status changes apply to the whole order and are checked by the server."
        actions={<>
          <span className="caption text-muted" aria-live="polite">Updated {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <button type="button" className="btn btn-outline" onClick={() => refresh()} disabled={refreshing}>
            {refreshing ? <Spinner /> : <RefreshCw size={16} aria-hidden="true" />} Refresh
          </button>
        </>}
      />

      <div className="toolbar">
        <div className="tab-list" role="group" aria-label="View">
          {[['queue', `Queue (${orders.filter(o => NEXT[upper(o.status)]).length})`], ['history', 'All orders']].map(([k, l]) => (
            <button key={k} type="button" className={`tab-item ${view === k ? 'active' : ''}`} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        <div className="tab-list" role="group" aria-label="Counter">
          {COUNTERS.map(c => (
            <button key={c.key} type="button" className={`tab-item ${counter === c.key ? 'active' : ''}`} aria-pressed={counter === c.key} onClick={() => setCounter(c.key)}>{c.label}</button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search orders</span>
          <input type="search" placeholder="Order number, customer or slot" value={search} onChange={e => setSearch(e.target.value)} />
        </label>
      </div>

      {view === 'queue' ? (
        <div className="queue-board">
          {COLUMNS.map(col => {
            const list = queue.filter(o => upper(o.status) === col.key);
            return (
              <section key={col.key} className="queue-column" aria-labelledby={`col-${col.key}`}>
                <div className={`queue-column-head ${col.key === 'READY' ? 'is-ready' : ''}`}>
                  <h2 id={`col-${col.key}`} className="heading-md">{col.title} <span className="text-muted tabular">{list.length}</span></h2>
                  <span className="caption text-muted">{col.hint}</span>
                </div>
                {list.length === 0 ? (
                  <p className="caption text-muted" style={{ padding: 'var(--space-md) 2px' }}>Nothing here.</p>
                ) : list.map(o => (
                  <QueueCard key={o.id} order={o} items={itemsForCounter(o)} busy={busyId === o.id}
                    onAdvance={() => advance(o)} onDetails={() => setDetail(o.id)} onCancel={() => setToCancel(o)} />
                ))}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="toolbar">
            <label className="sort-field">
              <span className="sr-only">Status</span>
              <select className="form-select" value={historyStatus} onChange={e => setHistoryStatus(e.target.value)}>
                <option value="all">Every status</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Collected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <span className="caption text-muted">{history.length} order{history.length === 1 ? '' : 's'}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportCSV} disabled={history.length === 0}>
              <Download size={15} aria-hidden="true" /> Export CSV
            </button>
          </div>
          {history.length === 0 ? (
            <EmptyState icon={Inbox} title="No orders match" message="Change the counter, status or search." />
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Items</th><th scope="col" className="num">Total</th>
                    <th scope="col">Slot</th><th scope="col">Status</th><th scope="col">Placed</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {history.map(o => (
                    <tr key={o.id}>
                      <td className="text-primary font-bold">{o.id}</td>
                      <td><div className="text-primary">{o.studentName}</div><div className="caption text-muted">{o.studentEmail}</div></td>
                      <td className="truncate" title={o.items.map(i => `${i.qty} × ${i.name}`).join(', ')}>{o.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</td>
                      <td className="num text-primary">₹{o.total}</td>
                      <td>{o.slotLabel}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="caption">{formatDateTime(o.createdAt)}</td>
                      <td><button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setDetail(o.id)} aria-label={`Details of ${o.id}`}><Eye size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {detailOrder && (
        <Modal title={`Order ${detailOrder.id}`} onClose={() => setDetail(null)}
          footer={<>
            {NEXT[upper(detailOrder.status)] && (
              <button type="button" className="btn btn-outline text-danger" onClick={() => setToCancel(detailOrder)}>Cancel order</button>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            {NEXT[upper(detailOrder.status)] && (
              <button type="button" className="btn btn-primary" disabled={busyId === detailOrder.id} onClick={() => advance(detailOrder)}>
                {busyId === detailOrder.id ? <Spinner /> : null} {NEXT[upper(detailOrder.status)].label}
              </button>
            )}
          </>}>
          <dl className="detail-list mb-md">
            <div><dt>Customer</dt><dd>{detailOrder.studentName}{detailOrder.studentEmail ? ` · ${detailOrder.studentEmail}` : ''}</dd></div>
            <div><dt>Pickup slot</dt><dd>{detailOrder.slotLabel}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge status={detailOrder.status} /></dd></div>
            <div><dt>Payment</dt><dd>{detailOrder.payMethod} · {detailOrder.paymentStatus === 'PENDING_CASH' ? `collect ₹${detailOrder.total} in cash` : String(detailOrder.paymentStatus || '').toLowerCase()}</dd></div>
            <div><dt>Placed</dt><dd>{formatDateTime(detailOrder.createdAt)}</dd></div>
          </dl>
          <ul className="summary-lines">
            {detailOrder.items.map((i, idx) => (
              <li key={idx}><span>{i.qty} × {i.name} <span className="caption text-muted">· {counterFor(i.category)}</span></span><span>₹{i.price * i.qty}</span></li>
            ))}
          </ul>
          <div className="summary-total"><span>Total</span><span className="price">₹{detailOrder.total}</span></div>
        </Modal>
      )}

      {toCancel && (
        <ConfirmDialog title={`Cancel order ${toCancel.id}?`}
          message={`The dishes go back into stock${toCancel.paymentStatus === 'PAID' ? ` and the ₹${toCancel.total} test payment is marked refunded` : ''}. The student will see the order as cancelled.`}
          confirmLabel="Cancel order" cancelLabel="Keep order" danger onConfirm={confirmCancel} onCancel={() => setToCancel(null)} />
      )}
    </div>
  );
}

function QueueCard({ order, items, busy, onAdvance, onDetails, onCancel }) {
  const next = NEXT[upper(order.status)];
  const others = order.items.length - items.length;
  const NextIcon = next.icon;
  return (
    <article className="queue-card" aria-label={`Order ${order.id}`}>
      <div className="queue-card-head">
        <span className="heading-md">{order.id}</span>
        <span className="caption text-muted">{order.slotLabel}</span>
      </div>
      <div className="caption text-secondary">{order.studentName}</div>
      <ul className="queue-card-items">
        {items.map((i, idx) => <li key={idx}><strong className="tabular">{i.qty}×</strong> {i.name}</li>)}
        {others > 0 && <li className="caption text-muted">+ {others} item{others === 1 ? '' : 's'} at the other counter</li>}
      </ul>
      {order.paymentStatus === 'PENDING_CASH' && upper(order.status) === 'READY' && (
        <span className="badge badge-warning">Collect ₹{order.total} cash</span>
      )}
      <div className="queue-card-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onAdvance} disabled={busy}>
          {busy ? <Spinner /> : <NextIcon size={14} aria-hidden="true" />} {next.label}
        </button>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onDetails} aria-label={`Details of ${order.id}`}><Eye size={16} /></button>
        <button type="button" className="btn btn-ghost btn-icon btn-sm text-danger" onClick={onCancel} aria-label={`Cancel ${order.id}`}><XCircle size={16} /></button>
      </div>
    </article>
  );
}
