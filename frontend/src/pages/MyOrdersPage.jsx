import { useState, useEffect } from 'react';
import { ChevronDown, ShoppingBag, RotateCcw, XCircle, ClipboardList, CircleAlert, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge, OrderTimeline, EmptyState, ConfirmDialog, Spinner } from '../components/Shared';
import { counterFor } from '../components/MenuCatalog';
import { isOrderable } from '../lib/cart';
import { formatDateTime } from '../lib/format';

const statusOf = (o) => String(o.status || '').toLowerCase();
const isActive = (o) => !['completed', 'cancelled'].includes(statusOf(o));
const FILTERS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'active', label: 'Active', test: isActive },
  { key: 'completed', label: 'Collected', test: o => statusOf(o) === 'completed' },
  { key: 'cancelled', label: 'Cancelled', test: o => statusOf(o) === 'cancelled' },
];

export default function MyOrdersPage({ setPage }) {
  const { myOrders, cancelOrder, fetchOrders, orderFetchError, menuItems, cart, addToCart, showToast } = useApp();
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Order status changes at the counter; refresh while active orders are on screen (skipped when the tab is hidden)
  const hasActive = myOrders.some(isActive);
  useEffect(() => {
    if (!hasActive) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') fetchOrders(); }, 30000);
    return () => clearInterval(t);
  }, [hasActive, fetchOrders]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const shown = myOrders.filter(FILTERS.find(f => f.key === filter).test);

  const confirmCancel = async () => {
    const res = await cancelOrder(toCancel.id);
    if (res.error) {
      showToast(res.error, 'danger');
    } else {
      showToast(`Order ${toCancel.id} cancelled.${toCancel.paymentStatus === 'PAID' ? ' The test payment was refunded.' : ''}`);
    }
    setToCancel(null);
  };

  // Re-adds the same dishes at today's prices, limited by current stock
  const reorder = (order) => {
    let added = 0;
    const skipped = [];
    for (const line of order.items) {
      const item = menuItems.find(m => m.id === line.menuItemId);
      if (!item || !isOrderable(item)) { skipped.push(line.name); continue; }
      const inCart = cart.find(c => c.menuItemId === item.id)?.qty || 0;
      const n = Math.max(0, Math.min(line.qty, item.qty - inCart));
      for (let i = 0; i < n; i++) addToCart(item);
      added += n;
      if (n < line.qty) skipped.push(line.name);
    }
    if (added === 0) {
      showToast('None of these dishes are available right now.', 'danger');
      return;
    }
    showToast(skipped.length ? `Added to your order. Not available now: ${skipped.join(', ')}.` : 'Added to your order at today’s prices.', skipped.length ? 'info' : 'success');
    setPage('order');
  };

  return (
    <div>
      <SectionHeader
        title="My orders"
        subtitle="Status updates from the counter appear here. Open an order to see its ticket and progress."
        actions={<>
          <button type="button" className="btn btn-ghost" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Spinner /> : <RefreshCw size={16} aria-hidden="true" />} Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setPage('order')}><ShoppingBag size={16} aria-hidden="true" /> New order</button>
        </>}
      />

      {orderFetchError && (
        <div className="alert alert-warning mb-lg" role="alert">
          <CircleAlert size={16} aria-hidden="true" /><span>{orderFetchError}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>Retry</button>
        </div>
      )}

      <div className="tab-list mb-lg" role="group" aria-label="Filter orders">
        {FILTERS.map(f => (
          <button key={f.key} type="button" className={`tab-item ${filter === f.key ? 'active' : ''}`}
            aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label} <span className="chip-count">{myOrders.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={ClipboardList}
          title={filter === 'all' ? 'No orders yet' : `No ${FILTERS.find(f => f.key === filter).label.toLowerCase()} orders`}
          message={filter === 'all' ? 'Orders you place appear here with their status and a QR ticket.' : 'Try another filter.'}
          action={filter === 'all' && <button type="button" className="btn btn-primary btn-sm" onClick={() => setPage('order')}>Place an order</button>} />
      ) : (
        <ul className="flex flex-col gap-md">
          {shown.map(order => (
            <li key={order.id}>
              <OrderCard order={order} expanded={expanded === order.id}
                onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
                onCancel={() => setToCancel(order)} onReorder={() => reorder(order)} />
            </li>
          ))}
        </ul>
      )}

      {toCancel && (
        <ConfirmDialog
          title={`Cancel order ${toCancel.id}?`}
          message={<>
            Your place in the <strong>{toCancel.slotLabel}</strong> slot will be released and the dishes returned to stock.
            {toCancel.paymentStatus === 'PAID' ? ` The test payment of ₹${toCancel.total} will be marked as refunded.` : ''} This can’t be undone.
          </>}
          confirmLabel="Cancel order" cancelLabel="Keep order" danger
          onConfirm={confirmCancel} onCancel={() => setToCancel(null)} />
      )}
    </div>
  );
}

function OrderCard({ order, expanded, onToggle, onCancel, onReorder }) {
  const st = statusOf(order);
  const canCancel = st === 'confirmed' || st === 'pending' || st === 'pending_payment';
  const active = isActive(order);
  const counters = [...new Set(order.items.map(i => counterFor(i.category)))];
  const detailsId = `order-${order.dbId || order.id}`;

  return (
    <article className="card" style={{ padding: 0 }}>
      <button type="button" className="w-full flex justify-between items-center gap-md" style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'left' }}
        onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId}>
        <span className="flex flex-col gap-xs" style={{ minWidth: 0 }}>
          <span className="flex items-center gap-sm flex-wrap">
            <span className="heading-md">{order.id}</span>
            <StatusBadge status={order.status} />
          </span>
          <span className="body-sm text-secondary truncate">{order.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</span>
          <span className="caption text-muted">{formatDateTime(order.createdAt)} · {order.slotLabel}</span>
        </span>
        <span className="flex items-center gap-md">
          <span className="heading-lg tabular">₹{order.total}</span>
          <ChevronDown size={18} className="text-muted" aria-hidden="true" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
        </span>
      </button>

      {expanded && (
        <div id={detailsId} style={{ padding: '0 var(--space-lg) var(--space-lg)', borderTop: '1px solid var(--border-subtle)', animation: 'rise 200ms both' }}>
          <div className="grid grid-2 gap-lg mt-md">
            <div className="flex flex-col gap-md">
              <h3 className="heading-sm">Items</h3>
              <ul className="summary-lines">
                {order.items.map(i => (
                  <li key={i.menuItemId || i.name}><span>{i.qty} × {i.name}</span><span>₹{i.price * i.qty}</span></li>
                ))}
              </ul>
              <div className="summary-total"><span>Total</span><span className="price">₹{order.total}</span></div>
              <dl className="detail-list">
                <div><dt>Payment</dt><dd>{order.payMethod} · {paymentText(order.paymentStatus)}</dd></div>
                {order.transactionId && <div><dt>Transaction</dt><dd className="mono">{order.transactionId}</dd></div>}
                <div><dt>Collect at</dt><dd>{counters.join(' and ')}</dd></div>
              </dl>
            </div>
            <div className="flex flex-col gap-md">
              <h3 className="heading-sm">Progress</h3>
              <OrderTimeline order={order} />
              {active && (
                <div className="qr-ticket" style={{ alignSelf: 'flex-start' }}>
                  <QRCodeSVG value={order.qrCodeData || order.id} size={128} bgColor="#ffffff" fgColor="#20211D" level="M"
                    title={`QR ticket for order ${order.id}`} />
                  <span className="qr-ticket-id">{order.id}</span>
                </div>
              )}
            </div>
          </div>
          <div className="card-actions mt-lg">
            {canCancel && (
              <button type="button" className="btn btn-outline text-danger btn-sm" onClick={onCancel}><XCircle size={14} aria-hidden="true" /> Cancel order</button>
            )}
            {!active && (
              <button type="button" className="btn btn-outline btn-sm" onClick={onReorder}><RotateCcw size={14} aria-hidden="true" /> Order these again</button>
            )}
            {!canCancel && active && <span className="caption text-muted">The kitchen has started this order, so it can no longer be cancelled here.</span>}
          </div>
        </div>
      )}
    </article>
  );
}

function paymentText(status) {
  switch (status) {
    case 'PAID': return 'paid';
    case 'PENDING_CASH': return 'cash due at pickup';
    case 'REFUNDED': return 'refunded';
    case 'CANCELLED': return 'not charged';
    default: return String(status || '').toLowerCase();
  }
}
