import { useState } from 'react';
import { QrCode, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, RotateCcw, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge, OrderTimeline, EmptyState } from '../components/Shared';
import { ORDER_STATUS } from '../data/mockData';
import { QRCodeSVG } from 'qrcode.react';

export default function MyOrdersPage({ setPage }) {
  const { myOrders, cancelOrder, rateOrder } = useApp();
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [ratingModal, setRatingModal] = useState(null);
  const [rating, setRating] = useState({ food: 0, taste: 0, quantity: 0, service: 0 });

  const filteredOrders = myOrders.filter(o => {
    if (filter === 'active') return ![ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(o.status);
    if (filter === 'completed') return o.status === ORDER_STATUS.COMPLETED;
    if (filter === 'cancelled') return o.status === ORDER_STATUS.CANCELLED;
    return true;
  });

  const handleRate = (orderId) => {
    rateOrder(orderId, rating);
    setRatingModal(null);
    setRating({ food: 0, taste: 0, quantity: 0, service: 0 });
  };

  return (
    <div>
      <SectionHeader
        title="My Orders"
        subtitle="Track, manage and rate your meal orders"
        actions={
          <button className="btn btn-primary" onClick={() => setPage('order')}>
            <QrCode size={16} /> New Order
          </button>
        }
      />

      {/* Tabs */}
      <div className="tab-list mb-lg">
        {['all', 'active', 'completed', 'cancelled'].map(f => (
          <div key={f} className={`tab-item ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'active' && myOrders.filter(o => ![ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(o.status)).length > 0 && (
              <span className="badge badge-primary" style={{ marginLeft: 6, fontSize: '0.65rem' }}>
                {myOrders.filter(o => ![ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(o.status)).length}
              </span>
            )}
          </div>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState icon="📋" title="No orders" message="Your orders will appear here" action={<button className="btn btn-primary" onClick={() => setPage('order')}>Place Order</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              expanded={expanded === order.id}
              onToggle={() => setExpanded(expanded === order.id ? null : order.id)}
              onCancel={() => cancelOrder(order.id)}
              onRate={() => setRatingModal(order.id)}
            />
          ))}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="modal-overlay" onClick={() => setRatingModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-lg">Rate Your Meal</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setRatingModal(null)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              {[
                { key: 'food', label: 'Food Quality' },
                { key: 'taste', label: 'Taste' },
                { key: 'quantity', label: 'Quantity' },
                { key: 'service', label: 'Service' },
              ].map(({ key, label }) => (
                <div key={key} className="flex justify-between items-center mb-md">
                  <span className="label">{label}</span>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={`star ${rating[key] >= n ? 'active' : ''}`} onClick={() => setRating(r => ({ ...r, [key]: n }))}>★</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setRatingModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleRate(ratingModal)}>Submit Rating</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, expanded, onToggle, onCancel, onRate }) {
  const canCancel = ![ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.PARTIALLY_SERVED].includes(order.status);
  const isCompleted = order.status === ORDER_STATUS.COMPLETED;
  const isCancelled = order.status === ORDER_STATUS.CANCELLED;

  return (
    <div className={`card ${expanded ? '' : ''}`} style={{ border: `1px solid ${expanded ? 'var(--border-default)' : 'var(--border-subtle)'}` }}>
      {/* Header */}
      <div className="flex justify-between items-start" style={{ cursor: 'pointer' }} onClick={onToggle}>
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="heading-md text-brand">{order.id}</span>
            <StatusBadge status={order.status} />
            {order.qrVerified && <span className="badge badge-success">✓ QR Scanned</span>}
          </div>
          <div className="body-sm text-secondary">
            {(order.items || []).map(i => `${i.name} ×${i.qty}`).join(' · ')}
          </div>
          <div className="flex items-center gap-md mt-xs">
            <span className="caption text-muted"><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Today'}</span>
            <span className="caption text-muted">📍 {order.slotLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <span className="heading-lg text-success">₹{order.total}</span>
          {expanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ marginTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-lg)' }}>
          <div className="grid grid-2 gap-lg">
            {/* Left: Details */}
            <div>
              <h4 className="heading-sm mb-md">Ordered Items</h4>

              <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                {(order.items || []).map(i => (
                  <div key={i.menuItemId || i.name} className="flex justify-between items-center mb-xs">
                    <span className="body-sm">{i.emoji || '🍽️'} {i.name} ×{i.qty}</span>
                    <span className="label text-brand">₹{i.price * i.qty}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <div className="alert alert-info" style={{ marginBottom: 'var(--space-md)' }}>
                  📝 {order.notes}
                </div>
              )}

              {/* Ratings */}
              {order.rating && (
                <div>
                  <div className="label text-muted mb-sm">Your Rating</div>
                  {Object.entries(order.rating).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center mb-xs">
                      <span className="caption text-secondary capitalize">{k}</span>
                      <div className="flex gap-xs">{[1,2,3,4,5].map(n => <span key={n} style={{ color: v >= n ? 'var(--color-warning)' : 'var(--text-muted)', fontSize: '0.875rem' }}>★</span>)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Timeline + QR */}
            <div>
              <h4 className="heading-sm mb-md">Order Status</h4>
              <OrderTimeline order={order} />

              {!isCompleted && !isCancelled && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                  <div className="caption text-muted mb-sm">Your QR Ticket</div>
                  <div className="qr-container" style={{ padding: 12, borderRadius: 12, background: '#fff', display: 'inline-block' }}>
                    <QRCodeSVG
                      value={JSON.stringify({ orderId: order.id, userId: order.userId, slot: order.slotLabel })}
                      size={120}
                      bgColor="#ffffff"
                      fgColor="#111221"
                      level="M"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-sm" style={{ marginTop: 'var(--space-md)' }}>
            {canCancel && <button className="btn btn-danger btn-sm" onClick={onCancel}><XCircle size={14} /> Cancel Order</button>}
            {isCompleted && !order.rating && <button className="btn btn-warning btn-sm" onClick={onRate}><Star size={14} /> Rate Meal</button>}
            {isCompleted && order.rating && <span className="badge badge-success">✓ Rated</span>}
            {isCancelled && <span className="badge badge-muted"><RotateCcw size={12} /> Cancelled — Refund simulated</span>}
          </div>
        </div>
      )}
    </div>
  );
}
