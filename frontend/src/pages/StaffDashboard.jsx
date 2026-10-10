import { useState } from 'react';
import { QrCode, CheckCircle, XCircle, Clock, AlertTriangle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge, AlertBanner, StatCard } from '../components/Shared';
import { ORDER_STATUS } from '../data/mockData';
import { QRCodeSVG } from 'qrcode.react';

// Staff dashboard – used by both Thali and Dishes counter staff
export default function StaffDashboard({ counterType }) {
  const { orders, markOrderServed, currentUser } = useApp();
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [filter, setFilter] = useState('pending');

  const isThali = counterType === 'thali';
  const label = isThali ? 'Thali' : 'Dishes';
  const counterField = isThali ? 'thaliStatus' : 'dishesStatus';

  // Only orders relevant to this counter
  const relevantOrders = orders.filter(o => {
    const hasItems = o.items.some(i => i.counter === (isThali ? 'thali' : 'dishes'));
    const notFinal = ![ORDER_STATUS.CANCELLED].includes(o.status);
    return hasItems && notFinal;
  });

  const pendingOrders = relevantOrders.filter(o => o[counterField] === 'preparing');
  const readyOrders = relevantOrders.filter(o => o[counterField] === 'ready');
  const servedOrders = relevantOrders.filter(o => o[counterField] === 'served');

  const displayOrders = filter === 'pending' ? pendingOrders
    : filter === 'ready' ? readyOrders
    : filter === 'served' ? servedOrders
    : relevantOrders;

  // QR Scan
  const handleScan = () => {
    const orderId = scanInput.trim().toUpperCase();
    if (!orderId) { setScanError('Please enter an Order ID or scan a QR code.'); return; }

    const order = orders.find(o => o.id === orderId);
    if (!order) { setScanError(`Order ${orderId} not found.`); setScanResult(null); return; }
    if (order.status === ORDER_STATUS.CANCELLED) { setScanError('This order has been cancelled.'); setScanResult(null); return; }
    if (!order.paymentConfirmed) { setScanError('Payment not confirmed for this order.'); setScanResult(null); return; }
    if (order[counterField] === 'served') { setScanError('This counter has already served this order.'); setScanResult(null); return; }
    if (!order.items.some(i => i.counter === (isThali ? 'thali' : 'dishes'))) { setScanError(`This order has no items for the ${label} counter.`); setScanResult(null); return; }

    setScanError('');
    setScanResult(order);
  };

  const handleMarkServed = (orderId) => {
    markOrderServed(orderId, isThali ? 'thali' : 'dishes');
    setScanResult(null);
    setScanInput('');
  };

  const counterItems = (order) => order.items.filter(i => i.counter === (isThali ? 'thali' : 'dishes'));

  return (
    <div>
      <SectionHeader
        title={`${label} Counter`}
        subtitle={`Counter staff dashboard — ${currentUser?.name}`}
        actions={<span className={`badge ${isThali ? 'badge-primary' : 'badge-info'} badge-lg`}>🟢 Counter Online</span>}
      />

      {/* Stats */}
      <div className="grid grid-4 mb-xl">
        <StatCard label="Pending" value={pendingOrders.length} icon={Clock} variant="warning" />
        <StatCard label="Ready" value={readyOrders.length} icon={QrCode} variant="info" />
        <StatCard label="Served Today" value={servedOrders.length} icon={CheckCircle} variant="success" />
        <StatCard label="Total" value={relevantOrders.length} icon={AlertTriangle} variant="primary" />
      </div>

      <div className="grid gap-lg" style={{ gridTemplateColumns: '1fr 380px', alignItems: 'start' }}>

        {/* ── Left: Orders List ──────────────────────────── */}
        <div>
          <div className="tab-list mb-md">
            <div className={`tab-item ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
              Preparing {pendingOrders.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{pendingOrders.length}</span>}
            </div>
            <div className={`tab-item ${filter === 'ready' ? 'active' : ''}`} onClick={() => setFilter('ready')}>
              Ready {readyOrders.length > 0 && <span className="badge badge-info" style={{ marginLeft: 6 }}>{readyOrders.length}</span>}
            </div>
            <div className={`tab-item ${filter === 'served' ? 'active' : ''}`} onClick={() => setFilter('served')}>Served</div>
            <div className={`tab-item ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</div>
          </div>

          {displayOrders.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
              <div className="heading-md">All clear!</div>
              <div className="body-sm text-muted">No {filter} orders at the moment</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {displayOrders.map(order => (
                <StaffOrderCard
                  key={order.id}
                  order={order}
                  counterStatus={order[counterField]}
                  counterItems={counterItems(order)}
                  onServe={() => handleMarkServed(order.id)}
                  canServe={order[counterField] !== 'served' && order[counterField] !== 'na'}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: QR Scanner ──────────────────────────── */}
        <div style={{ position: 'sticky', top: 'calc(var(--topbar-height) + 24px)' }}>
          <div className="card">
            <div className="flex items-center gap-sm mb-md">
              <QrCode size={20} color="var(--brand-primary)" />
              <h3 className="heading-lg">QR / Order Scanner</h3>
            </div>

            <div className="form-group mb-md">
              <label className="form-label">Scan QR or Enter Order ID</label>
              <div className="flex gap-sm">
                <input
                  className="form-input"
                  placeholder="e.g. MS10284"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleScan()}
                />
                <button className="btn btn-primary" onClick={handleScan}>
                  Scan
                </button>
              </div>
            </div>

            {scanError && <AlertBanner type="danger" icon={XCircle} message={scanError} />}

            {scanResult && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <div className="card-glass mb-md">
                  <div className="flex justify-between items-start mb-md">
                    <div>
                      <div className="heading-lg text-brand">{scanResult.id}</div>
                      <div className="body-sm text-secondary">{scanResult.studentName}</div>
                      <div className="caption text-muted">UID: {scanResult.studentUID}</div>
                    </div>
                    <StatusBadge status={scanResult.status} />
                  </div>

                  {/* Verification Checks */}
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    {[
                      { check: true, label: 'Order exists' },
                      { check: scanResult.paymentConfirmed, label: 'Payment confirmed' },
                      { check: scanResult.status !== ORDER_STATUS.CANCELLED, label: 'Not cancelled' },
                      { check: scanResult[counterField] !== 'served', label: `Not yet served at ${label} counter` },
                    ].map(({ check, label }) => (
                      <div key={label} className="flex items-center gap-sm" style={{ marginBottom: 4 }}>
                        {check ? <CheckCircle size={16} color="var(--color-success)" /> : <XCircle size={16} color="var(--color-danger)" />}
                        <span className={`body-sm ${check ? 'text-success' : 'text-danger'}`}>{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="divider" />
                  <div className="caption text-muted mb-sm">{label} Counter Items</div>
                  {counterItems(scanResult).map(item => (
                    <div key={item.menuItemId} className="flex justify-between">
                      <span className="label">{item.name} ×{item.qty}</span>
                      <span className="label">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  <div className="caption text-muted mt-sm">Pickup Slot: {scanResult.slotLabel}</div>
                </div>

                <button className="btn btn-success btn-full btn-lg" onClick={() => handleMarkServed(scanResult.id)}>
                  <CheckCircle size={18} /> Mark as Served
                </button>
              </div>
            )}

            {/* Upcoming demand preview */}
            <div className="divider" />
            <div className="heading-sm mb-sm">Next 15min Demand</div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 12 }}>
              {isThali ? (
                <>
                  <div className="flex justify-between body-sm"><span>Regular Thali</span><span className="text-brand">38</span></div>
                  <div className="flex justify-between body-sm"><span>Special Thali</span><span className="text-brand">17</span></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between body-sm"><span>Buttermilk</span><span className="text-brand">29</span></div>
                  <div className="flex justify-between body-sm"><span>Steamed Rice</span><span className="text-brand">12</span></div>
                  <div className="flex justify-between body-sm"><span>Curd Bowl</span><span className="text-brand">8</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffOrderCard({ order, counterStatus, counterItems, onServe, canServe }) {
  const statusColor = counterStatus === 'served' ? 'badge-success' : counterStatus === 'ready' ? 'badge-info' : 'badge-warning';
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-md">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <span className="heading-md text-brand">{order.id}</span>
            <span className={`badge ${statusColor}`}>{counterStatus}</span>
          </div>
          <div className="body-sm text-secondary">{order.studentName} · {order.studentUID}</div>
          <div className="caption text-muted">📍 {order.slotLabel}</div>
        </div>
        {canServe && (
          <button className="btn btn-success btn-sm" onClick={onServe}>
            <CheckCircle size={14} /> Mark Served
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {counterItems.map(item => (
          <div key={item.menuItemId} className="flex justify-between" style={{ padding: '6px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
            <span className="label">{item.name}</span>
            <span className="badge badge-primary">×{item.qty}</span>
          </div>
        ))}
      </div>
      {order.notes && <div className="alert alert-info mt-sm"><span>📝 {order.notes}</span></div>}
    </div>
  );
}
