import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, TrendingUp, Clock, Package, CreditCard, Store, RefreshCw, Search, Eye,
  AlertTriangle, Info, Cpu, Activity, Database, Server, ClipboardList, UtensilsCrossed, BarChart3,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { StatCard, SectionHeader, StatusBadge, EmptyState, Modal, Spinner } from '../components/Shared';
import { formatINR, formatDateTime, formatPercent, formatBytes } from '../lib/format';

/**
 * Administrator reporting pages. Every figure shown here is computed by the backend
 * (/api/admin/overview, /payment-records, /analytics, /forecast, /monitoring, /api/slots);
 * the pages only display it, so Overview, Payment Records and Analytics always agree.
 */

// Bar colours chosen for at least 3:1 contrast against the card surface in each theme
const CHART = {
  dark: { primary: '#C8F169', secondary: '#8F9188' },
  light: { primary: '#4A6311', secondary: '#8A8D84' },
};
const tooltipStyle = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)' };

/** GET helper for admin JSON endpoints with loading / error state. */
function useAdminData(url) {
  const { authHeaders } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, { headers: authHeaders() });
      const body = await res.json().catch(() => null);
      if (res.ok) setData(body);
      else if (res.status === 403) setError('Administrator access is required for this page.');
      else if (res.status === 401) setError('Your session has expired. Please sign in again.');
      else setError(body?.error || `Request failed (status ${res.status})`);
    } catch {
      setError('Cannot reach the MealSync server.');
    } finally {
      setLoading(false);
    }
  }, [url, authHeaders]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

function LoadState({ loading, error, onRetry }) {
  if (loading) return <div className="card"><div className="loading-row"><Spinner /> Loading…</div></div>;
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <AlertTriangle size={16} aria-hidden="true" /><span>{error}</span>
        {onRetry && <button type="button" className="btn btn-outline btn-sm" onClick={onRetry}>Retry</button>}
      </div>
    );
  }
  return null;
}

const CATEGORY_BADGE = {
  COLLECTED: ['badge-success', 'Paid'],
  PENDING: ['badge-warning', 'Pending'],
  REFUNDED: ['badge-muted', 'Refunded'],
  CANCELLED_UNPAID: ['badge-muted', 'Cancelled'],
  FAILED: ['badge-danger', 'Failed'],
};

function PaymentBadge({ category, raw }) {
  const [cls, label] = CATEGORY_BADGE[category] || ['badge-muted', raw || 'Unknown'];
  return <span className={`badge ${cls}`} title={raw}>{label}</span>;
}

// ─── Overview ─────────────────────────────────────────────
export function AdminDashboard({ setPage }) {
  const { orders, menuItems, adminOverview, slots, fetchOrders } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const today = adminOverview?.todaySummary;
  const onMenu = menuItems.filter(m => m.visible);
  const lowStock = onMenu.filter(m => m.qty > 0 && m.qty <= 5);
  const soldOut = onMenu.filter(m => m.qty <= 0);
  const fullSlots = slots.filter(s => s.active && s.remaining === 0);
  const activeOrders = orders.filter(o => ['CONFIRMED', 'PREPARING', 'READY', 'PENDING'].includes(String(o.status).toUpperCase()));

  const refresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const shortcuts = [
    { page: 'admin-orders', label: 'Order queue', icon: ClipboardList },
    { page: 'counter-sale', label: 'Counter sale', icon: Store },
    { page: 'menu-mgmt', label: 'Product catalog', icon: UtensilsCrossed },
    { page: 'payment-records', label: 'Payment records', icon: CreditCard },
    { page: 'slot-mgmt', label: 'Pickup slots', icon: Clock },
    { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div>
      <SectionHeader
        title="Overview"
        subtitle={`Today at a glance (${today?.timeZone || 'campus time'}). Details live on the linked pages.`}
        actions={<button type="button" className="btn btn-outline btn-sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Spinner /> : <RefreshCw size={14} aria-hidden="true" />} Refresh</button>}
      />

      {!adminOverview ? (
        <div className="card mb-lg"><div className="loading-row"><Spinner /> Loading today's figures…</div></div>
      ) : (
        <div className="grid grid-4 gap-md mb-lg">
          <StatCard label="Orders today" value={adminOverview.todayOrders} icon={ShoppingCart} sub="Excludes cancelled orders" />
          <StatCard label="Collected today" value={formatINR(adminOverview.todaySales)} icon={TrendingUp} variant="success"
            sub={today ? `${today.collectedCount} paid · ${formatINR(today.portalCollected)} portal · ${formatINR(today.counterCollected)} counter` : null} />
          <StatCard label="Pending payments" value={formatINR(today?.pendingAmount)} icon={Clock} variant="warning"
            sub={today ? `${today.pendingCount} cash-on-pickup order${today.pendingCount === 1 ? '' : 's'} today` : null} />
          <StatCard label="Active orders" value={adminOverview.pendingOrders} icon={Package} variant="info"
            sub={`${adminOverview.availableProducts} items available · ${adminOverview.soldOutProducts} sold out`} />
        </div>
      )}

      <div className="grid grid-2 gap-lg mb-lg">
        <section className="card" aria-labelledby="alerts-title">
          <h2 id="alerts-title" className="heading-md mb-md">Needs attention</h2>
          <ul className="plain-list">
            {soldOut.length > 0 && <li className="alert alert-warning"><AlertTriangle size={16} aria-hidden="true" /><span><strong>{soldOut.length}</strong> item{soldOut.length === 1 ? '' : 's'} sold out or unavailable</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage('menu-mgmt')}>Product catalog</button></li>}
            {lowStock.length > 0 && <li className="alert alert-warning"><AlertTriangle size={16} aria-hidden="true" /><span>Low stock: {lowStock.slice(0, 4).map(m => `${m.name} (${m.qty})`).join(', ')}{lowStock.length > 4 ? '…' : ''}</span></li>}
            {fullSlots.length > 0 && <li className="alert alert-warning"><Clock size={16} aria-hidden="true" /><span>Full pickup slots today: {fullSlots.map(s => s.label).join(', ')}</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage('slot-mgmt')}>Pickup slots</button></li>}
            {today?.pendingCount > 0 && <li className="alert alert-info"><Info size={16} aria-hidden="true" /><span>{today.pendingCount} order{today.pendingCount === 1 ? '' : 's'} awaiting cash at pickup ({formatINR(today.pendingAmount)})</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage('payment-records')}>Payment records</button></li>}
            {soldOut.length === 0 && lowStock.length === 0 && fullSlots.length === 0 && !(today?.pendingCount > 0) && (
              <li className="body-sm text-muted">Nothing needs attention right now.</li>
            )}
          </ul>
        </section>

        <section className="card" aria-labelledby="shortcuts-title">
          <h2 id="shortcuts-title" className="heading-md mb-md">Go to</h2>
          <div className="grid grid-2 gap-sm">
            {shortcuts.map(s => (
              <button key={s.page} type="button" className="btn btn-outline" onClick={() => setPage(s.page)}>
                <s.icon size={16} aria-hidden="true" /> {s.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="card" aria-labelledby="recent-title">
        <div className="summary-header mb-md">
          <h2 id="recent-title" className="heading-md">Active orders ({activeOrders.length})</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage('admin-orders')}>Open the order queue</button>
        </div>
        {activeOrders.length === 0 ? <p className="body-sm text-muted">No active orders.</p> : (
          <div className="table-container">
            <table>
              <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Slot</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {activeOrders.slice(0, 5).map(o => (
                  <tr key={o.dbId || o.id}>
                    <td className="font-bold">{o.id}</td>
                    <td>{o.studentName}</td>
                    <td className="truncate">{o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</td>
                    <td>{formatINR(o.total)}</td>
                    <td>{o.slotLabel}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Payment Records ──────────────────────────────────────
export function PaymentRecordsPage({ setPage }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // submitted search (no request per keystroke)
  const [source, setSource] = useState('ALL');
  const [method, setMethod] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);

  const params = new URLSearchParams();
  if (source !== 'ALL') params.set('source', source);
  if (method !== 'ALL') params.set('method', method);
  if (status !== 'ALL') params.set('status', status);
  if (query) params.set('search', query);
  const { data, loading, error, reload } = useAdminData(`/api/admin/payment-records?${params.toString()}`);
  const records = data?.records || [];
  const s = data?.summary;

  return (
    <div>
      <SectionHeader
        title="Payment records"
        subtitle="Every order is one transaction. Totals are calculated by the server for exactly the rows shown."
        actions={<button type="button" className="btn btn-outline btn-sm" onClick={reload} disabled={loading}><RefreshCw size={14} aria-hidden="true" /> Refresh</button>}
      />

      {s && (
        <div className="grid grid-4 gap-md mb-lg">
          <StatCard label="Collected" value={formatINR(s.collectedRevenue)} icon={TrendingUp} variant="success" sub={`${s.collectedCount} paid · ${formatINR(s.portalCollected)} portal / ${formatINR(s.counterCollected)} counter`} />
          <StatCard label="Pending" value={formatINR(s.pendingAmount)} icon={Clock} variant="warning" sub={`${s.pendingCount} awaiting cash at pickup`} />
          <StatCard label="Refunded / cancelled" value={formatINR(s.refundedAmount)} icon={CreditCard} variant="danger" sub={`${s.cancelledCount} cancelled orders, ${s.refundedCount} of them refunded`} />
          <StatCard label="Transactions" value={s.transactionCount} icon={Store} variant="info" sub={`${s.portalCount} portal · ${s.counterCount} counter`} />
        </div>
      )}

      <form className="toolbar" onSubmit={e => { e.preventDefault(); setQuery(search.trim()); }}>
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search payment records</span>
          <input type="search" placeholder="Order #, customer name or email, transaction ID" value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) setQuery(''); }} />
        </label>
        <button type="submit" className="btn btn-outline">Search</button>
        <label className="sort-field"><span className="sr-only">Source</span>
          <select className="form-select" value={source} onChange={e => setSource(e.target.value)}>
            <option value="ALL">All sources</option><option value="PORTAL">Portal</option><option value="COUNTER">Counter</option>
          </select></label>
        <label className="sort-field"><span className="sr-only">Payment method</span>
          <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>
            <option value="ALL">All methods</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="CASH">Cash</option><option value="WALLET">Mess wallet</option>
          </select></label>
        <div className="chip-row" role="tablist" aria-label="Payment status">
          {[['ALL', 'All'], ['PAID', 'Paid'], ['PENDING', 'Pending'], ['REFUNDED', 'Refunded / cancelled']].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={status === v} className={`chip ${status === v ? 'active' : ''}`} onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
      </form>

      <LoadState loading={loading && !data} error={error} onRetry={reload} />

      {data && (records.length === 0 ? (
        <EmptyState title="No transactions found" message="Try another search or filter." />
      ) : (
        <div className="table-container">
          <table>
            <thead><tr>
              <th scope="col">Order</th><th scope="col">Source</th><th scope="col">Customer</th><th scope="col">Items</th>
              <th scope="col">Total</th><th scope="col">Method</th><th scope="col">Payment</th><th scope="col">Date</th><th scope="col"><span className="sr-only">Details</span></th>
            </tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td><div className="font-bold">{r.orderNumber}</div>{r.transactionId && <div className="mono caption text-muted">{r.transactionId}</div>}</td>
                  <td><span className={`badge ${r.orderSource === 'COUNTER' ? 'badge-info' : 'badge-muted'}`}>{r.orderSource === 'COUNTER' ? 'Counter' : 'Portal'}</span></td>
                  <td><div className="label">{r.customerName || 'Walk-in customer'}</div><div className="caption text-muted">{r.customerEmail || (r.registeredCustomer ? '' : 'Walk-in')}</div></td>
                  <td className="truncate" title={r.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}>{r.items.length ? r.items.map(i => `${i.quantity}× ${i.name}`).join(', ') : '—'}</td>
                  <td className="font-bold">{formatINR(r.totalAmount)}</td>
                  <td>{r.paymentMethod || '—'}</td>
                  <td><PaymentBadge category={r.paymentCategory} raw={r.paymentStatus} /></td>
                  <td className="caption">{formatDateTime(r.orderTime)}</td>
                  <td><button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(r)} aria-label={`Details of ${r.orderNumber}`}><Eye size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {selected && (
        <Modal title={`Transaction ${selected.orderNumber}`} onClose={() => setSelected(null)} labelledBy="payment-detail-title"
          footer={<>
            <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            <button type="button" className="btn btn-primary" onClick={() => { setSelected(null); setPage?.('admin-orders'); }}>Open in the order queue</button>
          </>}>
          <dl className="detail-list mb-md">
            <div><dt>Customer</dt><dd>{selected.customerName || 'Walk-in customer'}{selected.customerEmail ? ` · ${selected.customerEmail}` : ''}</dd></div>
            <div><dt>Source</dt><dd>{selected.orderSource === 'COUNTER' ? `Counter sale${selected.counterOperator ? ` by ${selected.counterOperator}` : ''}` : 'Student portal'}</dd></div>
            <div><dt>Payment</dt><dd>{selected.paymentMethod || '—'} · <PaymentBadge category={selected.paymentCategory} raw={selected.paymentStatus} /> <span className="caption text-muted">({selected.paymentStatus})</span></dd></div>
            <div><dt>Transaction ID</dt><dd className="mono">{selected.transactionId || '—'}</dd></div>
            <div><dt>Order status</dt><dd><StatusBadge status={selected.orderStatus} /></dd></div>
            <div><dt>Pickup</dt><dd>{selected.pickupSlot || '—'}</dd></div>
            <div><dt>Placed</dt><dd>{formatDateTime(selected.orderTime)} (business day {selected.businessDate})</dd></div>
          </dl>
          <ul className="summary-lines">
            {selected.items.map((i, idx) => (
              <li key={idx}><span>{i.quantity} × {i.name} <span className="caption text-muted">@ {formatINR(i.unitPrice)}</span></span><span>{formatINR(i.subtotal)}</span></li>
            ))}
          </ul>
          <div className="summary-total"><span>Order total</span><span className="price">{formatINR(selected.totalAmount)}</span></div>
          {selected.qrCodeData && <div className="text-center mt-md"><div className="qr-ticket"><QRCodeSVG value={selected.qrCodeData} size={110} /></div></div>}
        </Modal>
      )}
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────
function delta(curr, prev) {
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 100);
}

export function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const { data, loading, error, reload } = useAdminData(`/api/admin/analytics?days=${days}`);
  const { theme } = useApp();
  const colors = CHART[theme] || CHART.dark;
  const s = data?.summary;
  const p = data?.previousSummary;
  const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  return (
    <div>
      <SectionHeader title="Analytics" subtitle="Historical figures from recorded orders, using the same definitions as Payment Records."
        actions={
          <div className="chip-row" role="tablist" aria-label="Period">
            {[7, 14, 30].map(d => (
              <button key={d} type="button" role="tab" aria-selected={days === d} className={`chip ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>Last {d} days</button>
            ))}
          </div>
        } />

      <LoadState loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <p className="caption text-muted mb-md">{data.from} to {data.to} ({data.timeZone}). Compared with the previous {days} days.</p>
          <div className="grid grid-4 gap-md mb-lg">
            <StatCard label="Collected revenue" value={formatINR(s.collectedRevenue)} icon={TrendingUp} variant="success" trend={delta(s.collectedRevenue, p.collectedRevenue) ?? undefined} />
            <StatCard label="Orders (not cancelled)" value={s.collectedCount + s.pendingCount} icon={ShoppingCart} trend={delta(s.collectedCount + s.pendingCount, p.collectedCount + p.pendingCount) ?? undefined} />
            <StatCard label="Portal / counter" value={`${formatINR(s.portalCollected)} / ${formatINR(s.counterCollected)}`} icon={Store} variant="info" />
            <StatCard label="Refunded / cancelled" value={formatINR(s.refundedAmount)} icon={CreditCard} variant="danger" sub={`${s.cancelledCount} cancelled orders`} />
          </div>

          <div className="grid grid-2 gap-lg mb-lg">
            <section className="chart-container" aria-labelledby="rev-chart">
              <h2 id="rev-chart" className="chart-title">Collected revenue per day</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} formatter={v => [formatINR(v), 'Collected']} />
                  <Bar dataKey="collectedRevenue" fill={colors.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
            <section className="chart-container" aria-labelledby="orders-chart">
              <h2 id="orders-chart" className="chart-title">Orders per day</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} formatter={v => [v, 'Orders']} />
                  <Bar dataKey="orders" fill={colors.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>

          <section className="card" aria-labelledby="top-items">
            <h2 id="top-items" className="heading-md mb-md">Most ordered items</h2>
            {data.topItems.length === 0 ? <p className="body-sm text-muted">No orders in this period.</p> : (
              <div className="table-container">
                <table>
                  <thead><tr><th scope="col">#</th><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Orders</th><th scope="col">Value</th></tr></thead>
                  <tbody>{data.topItems.map((it, i) => (
                    <tr key={it.name}><td>{i + 1}</td><td>{it.name}</td><td>{it.quantity}</td><td>{it.orders}</td><td>{formatINR(it.value)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ─── Demand Forecast ──────────────────────────────────────
export function DemandForecast() {
  const [days, setDays] = useState(7);
  const { data, loading, error, reload } = useAdminData(`/api/admin/forecast?days=${days}`);
  const daysWithOrders = data?.items?.[0]?.daysWithOrders ?? 0;

  return (
    <div>
      <SectionHeader title="Demand forecast" subtitle="Preparation estimates derived from recent order history."
        actions={
          <div className="chip-row" role="tablist" aria-label="History used">
            {[7, 14, 30].map(d => (
              <button key={d} type="button" role="tab" aria-selected={days === d} className={`chip ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>Based on {d} days</button>
            ))}
          </div>
        } />

      <div className="alert alert-info mb-lg">
        <Info size={16} aria-hidden="true" />
        <span><strong>Estimate, not actual orders and not an AI model.</strong> {data?.method || 'Simple moving average of recent orders.'}</span>
      </div>

      <LoadState loading={loading && !data} error={error} onRetry={reload} />

      {data && (data.items.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Not enough history" message={`No orders were recorded in the last ${days} days, so there is nothing to estimate yet.`} />
      ) : (
        <>
          {daysWithOrders < 3 && (
            <div className="alert alert-warning mb-md"><AlertTriangle size={16} aria-hidden="true" />
              <span>Only {daysWithOrders} day{daysWithOrders === 1 ? '' : 's'} in this window had orders — treat these estimates as rough.</span></div>
          )}
          <div className="table-container">
            <table>
              <thead><tr><th scope="col">Item</th><th scope="col">Ordered in last {days} days</th><th scope="col">Average per day</th><th scope="col">Suggested prep per day</th></tr></thead>
              <tbody>{data.items.map(it => (
                <tr key={it.name}><td>{it.name}</td><td>{it.totalQuantity}</td><td>{it.averagePerDay}</td><td className="font-bold">{it.suggestedPrep}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="caption text-muted mt-md">Suggested prep = average per day rounded up. Time zone: {data.timeZone}.</p>
        </>
      ))}
    </div>
  );
}

// ─── Cloud Monitoring ─────────────────────────────────────
function Metric({ label, value, icon: Icon, note }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-card-text">
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value ?? <span className="text-muted" style={{ fontSize: '1rem' }}>Unavailable</span>}</div>
          {note && <div className="caption text-muted">{note}</div>}
        </div>
        {Icon && <div className="stat-icon" aria-hidden="true"><Icon size={20} /></div>}
      </div>
    </div>
  );
}

export function CloudMonitoring() {
  const { data, loading, error, reload } = useAdminData('/api/admin/monitoring');

  useEffect(() => {
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, [reload]);

  const a = data?.application;
  const h = data?.http;
  const r = data?.runtime;
  const uptime = a?.uptimeSeconds != null ? `${Math.floor(a.uptimeSeconds / 3600)}h ${Math.floor((a.uptimeSeconds % 3600) / 60)}m` : null;

  return (
    <div>
      <SectionHeader title="Monitoring" subtitle="Live metrics of the backend instance, refreshed every 15 seconds. Nothing on this page is simulated."
        actions={<button type="button" className="btn btn-outline btn-sm" onClick={reload}><RefreshCw size={14} aria-hidden="true" /> Refresh</button>} />

      <LoadState loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <div className="alert alert-info mb-lg">
            <Activity size={16} aria-hidden="true" />
            <span><strong>Live:</strong> {data.scope} Instance <span className="mono">{r.instance}</span> · environment: {r.environment === 'kubernetes' ? 'Kubernetes' : 'Docker / local'}.</span>
          </div>

          <h2 className="heading-md mb-md">Backend instance</h2>
          <div className="grid grid-4 gap-md mb-lg">
            <Metric label="Process CPU" value={formatPercent(a.processCpuUsage)} icon={Cpu} note={a.systemCpuUsage != null ? `Host/container: ${formatPercent(a.systemCpuUsage)} · ${a.availableProcessors} CPUs` : null} />
            <Metric label="JVM heap used" value={formatBytes(a.heapUsedBytes)} icon={Server} note={a.heapMaxBytes ? `of ${formatBytes(a.heapMaxBytes)} max` : null} />
            <Metric label="DB connections" value={a.dbConnectionsActive != null ? `${a.dbConnectionsActive} active` : null} icon={Database} note={a.dbConnectionsIdle != null ? `${a.dbConnectionsIdle} idle (HikariCP)` : null} />
            <Metric label="Uptime" value={uptime} icon={Clock} />
          </div>

          <h2 className="heading-md mb-md">API traffic <span className="caption text-muted">(since this instance started, excluding /actuator)</span></h2>
          <div className="grid grid-3 gap-md mb-lg">
            <Metric label="Requests" value={h.requestsSinceStart} icon={Activity} />
            <Metric label="Average latency" value={h.averageLatencyMs != null ? `${h.averageLatencyMs} ms` : null} icon={Clock} note={`Recent max: ${h.maxLatencyMsRecent} ms`} />
            <Metric label="Server error rate (5xx)" value={formatPercent(h.serverErrorRate, 2)} icon={AlertTriangle} note={`${h.serverErrorsSinceStart} server errors`} />
          </div>

          <h2 className="heading-md mb-md">Infrastructure</h2>
          <div className="grid grid-3 gap-md mb-lg">
            <div className="card"><h3 className="heading-sm mb-xs">Docker Compose (local)</h3>
              <p className="body-sm text-secondary">Per-container CPU and memory are collected by cAdvisor and shown in the Grafana dashboard “MealSync — Container &amp; Application Metrics” (Grafana runs on the host, port from <span className="mono">GRAFANA_HOST_PORT</span>).</p></div>
            <div className="card"><h3 className="heading-sm mb-xs">Kubernetes</h3><p className="body-sm text-secondary">{r.kubernetes}</p></div>
            <div className="card"><h3 className="heading-sm mb-xs">AWS</h3><p className="body-sm text-secondary">{r.aws}</p></div>
          </div>

          <h2 className="heading-md mb-sm">Not measured</h2>
          <ul className="plain-list">{data.unavailable.map(u => <li key={u} className="body-sm text-muted">• {u}</li>)}</ul>
        </>
      )}
    </div>
  );
}

// ─── Pickup Slots ─────────────────────────────────────────
export function SlotManagement() {
  const { slots, fetchSlots, authHeaders } = useApp();
  const [edits, setEdits] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);
  const [form, setForm] = useState({ label: '', mealPeriod: 'lunch', startTime: '', endTime: '', capacity: 50 });

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const send = async (url, method, body, key) => {
    setBusy(key);
    setMessage(null);
    try {
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage({ type: 'danger', text: data.error || `Request failed (status ${res.status})` }); return false; }
      await fetchSlots();
      return true;
    } catch {
      setMessage({ type: 'danger', text: 'Cannot reach the server.' });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const saveCapacity = async (slot) => {
    const capacity = Number(edits[slot.id] ?? slot.capacity);
    if (await send(`/api/admin/slots/${slot.id}`, 'PUT', { capacity }, `cap-${slot.id}`)) {
      setMessage({ type: 'success', text: `${slot.label}: capacity set to ${capacity}.` });
    }
  };

  const toggle = (slot) => send(`/api/admin/slots/${slot.id}`, 'PUT', { active: !slot.active }, `act-${slot.id}`);

  const create = async (e) => {
    e.preventDefault();
    if (await send('/api/admin/slots', 'POST', { ...form, capacity: Number(form.capacity) }, 'create')) {
      setMessage({ type: 'success', text: `Slot ${form.label} created.` });
      setForm({ label: '', mealPeriod: 'lunch', startTime: '', endTime: '', capacity: 50 });
    }
  };

  return (
    <div>
      <SectionHeader title="Pickup slots" subtitle="Today's bookings per window. Capacity is enforced by the server when students order." />
      {message && <div className={`alert alert-${message.type} mb-md`} role={message.type === 'danger' ? 'alert' : 'status'}>{message.text}</div>}

      {slots.length === 0 ? <div className="card"><div className="loading-row"><Spinner /> Loading slots…</div></div> : (
        <div className="table-container mb-lg">
          <table>
            <thead><tr><th scope="col">Slot</th><th scope="col">Meal</th><th scope="col">Booked today</th><th scope="col">Capacity</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {slots.map(slot => (
                <tr key={slot.id}>
                  <td className="font-bold">{slot.label}</td>
                  <td className="capitalize">{slot.mealPeriod}</td>
                  <td>{slot.booked} <span className="caption text-muted">({slot.remaining} left)</span></td>
                  <td>
                    <div className="flex items-center gap-sm">
                      <label className="sr-only" htmlFor={`cap-${slot.id}`}>Capacity of {slot.label}</label>
                      <input id={`cap-${slot.id}`} className="form-input" style={{ width: 90 }} type="number" min={1} max={1000}
                        value={edits[slot.id] ?? slot.capacity} onChange={e => setEdits(prev => ({ ...prev, [slot.id]: e.target.value }))} />
                      <button type="button" className="btn btn-outline btn-sm" disabled={busy !== null || Number(edits[slot.id] ?? slot.capacity) === slot.capacity}
                        onClick={() => saveCapacity(slot)}>{busy === `cap-${slot.id}` ? <Spinner /> : 'Save'}</button>
                    </div>
                  </td>
                  <td>
                    <button type="button" className={`btn btn-sm ${slot.active ? 'btn-outline' : 'btn-primary'}`} disabled={busy !== null} onClick={() => toggle(slot)}>
                      {busy === `act-${slot.id}` ? <Spinner /> : slot.active ? 'Close slot' : 'Open slot'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form className="card form-stack" onSubmit={create} aria-labelledby="new-slot">
        <h2 id="new-slot" className="heading-md">Add a slot</h2>
        <div className="grid grid-4 gap-md">
          <div className="form-group"><label className="form-label" htmlFor="slot-label">Label</label>
            <input id="slot-label" className="form-input" required maxLength={50} placeholder="1:30 – 1:45" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="slot-period">Meal</label>
            <select id="slot-period" className="form-select" value={form.mealPeriod} onChange={e => setForm({ ...form, mealPeriod: e.target.value })}>
              <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select></div>
          <div className="form-group"><label className="form-label" htmlFor="slot-start">Start</label>
            <input id="slot-start" className="form-input" type="time" required value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="slot-end">End</label>
            <input id="slot-end" className="form-input" type="time" required value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="slot-cap">Capacity</label>
            <input id="slot-cap" className="form-input" type="number" min={1} max={1000} required value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
        </div>
        <div><button type="submit" className="btn btn-primary" disabled={busy !== null}>{busy === 'create' ? <Spinner /> : 'Add slot'}</button></div>
      </form>
    </div>
  );
}
