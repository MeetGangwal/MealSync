import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { SectionHeader, ProgressBar } from '../components/Shared';
import { Star, Package, Pause, Play, SkipForward } from 'lucide-react';
import { USERS } from '../data/mockData';

export function LiveMenuPage({ setPage }) {
  const { menuItems } = useApp();
  const thali = menuItems.filter(i => i.counter === 'thali');
  const dishes = menuItems.filter(i => i.counter === 'dishes');

  return (
    <div>
      <SectionHeader
        title="Live Menu"
        subtitle="Real-time availability — updated as orders are placed"
        actions={
          <div className="flex items-center gap-sm">
            <div className="status-dot online pulse" />
            <span className="body-sm text-success">Live • Updates in real-time</span>
          </div>
        }
      />

      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-md">
          <span style={{ fontSize: '1.75rem' }}>🍱</span>
          <h2 className="heading-lg">Thali Counter</h2>
          <span className="badge badge-primary">Counter 1</span>
        </div>
        <div className="grid grid-3 gap-md">
          {thali.map(item => <LiveMenuItem key={item.id} item={item} onOrder={() => setPage('order')} />)}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-sm mb-md">
          <span style={{ fontSize: '1.75rem' }}>🍴</span>
          <h2 className="heading-lg">Other Dishes Counter</h2>
          <span className="badge badge-info">Counter 2</span>
        </div>
        <div className="grid grid-3 gap-md">
          {dishes.map(item => <LiveMenuItem key={item.id} item={item} onOrder={() => setPage('order')} />)}
        </div>
      </div>
    </div>
  );
}

function LiveMenuItem({ item, onOrder }) {
  const soldOut = !item.available || item.qty === 0;
  const pct = (item.qty / item.initialQty) * 100;
  const variant = soldOut ? 'danger' : pct < 20 ? 'warning' : 'success';

  return (
    <div className={`card ${soldOut ? 'opacity-50' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
      {soldOut && (
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--grad-danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.1em' }}>
          SOLD OUT
        </div>
      )}
      {item.popular && !soldOut && (
        <div style={{ position: 'absolute', top: 12, right: 12, background: 'var(--grad-warning)', color: '#0A0B14', fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20 }}>
          🔥 Popular
        </div>
      )}
      <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', textAlign: 'center' }}>{item.emoji}</div>
      <div className="heading-md mb-xs" style={{ textAlign: 'center' }}>{item.name}</div>
      <div className="body-sm text-muted mb-md" style={{ textAlign: 'center' }}>{item.description}</div>

      <div className="flex justify-between items-center mb-md">
        <span className="display-md text-brand">₹{item.price}</span>
        <span className="caption text-muted">⭐ {item.rating}</span>
      </div>

      <div className="mb-sm">
        <div className="flex justify-between caption mb-xs">
          <span className="text-muted">Availability</span>
          <span className={soldOut ? 'text-danger' : pct < 20 ? 'text-warning' : 'text-success'}>
            {soldOut ? '0 left' : `${item.qty} / ${item.initialQty}`}
          </span>
        </div>
        <ProgressBar value={item.qty} max={item.initialQty} variant={variant} />
      </div>

      <button
        className={`btn btn-full ${soldOut ? 'btn-ghost' : 'btn-primary'}`}
        disabled={soldOut}
        onClick={onOrder}
        style={{ marginTop: 'var(--space-sm)' }}
      >
        {soldOut ? 'Sold Out' : 'Add to Order'}
      </button>
    </div>
  );
}

// ─── Subscription Page ────────────────────────────────────
export function SubscriptionPage() {
  const { subscriptions } = useApp();

  return (
    <div>
      <SectionHeader title="Meal Subscriptions" subtitle="Manage your monthly meal plans" />

      <div className="grid grid-2 gap-lg mb-xl">
        {subscriptions.map(plan => (
          <div key={plan.id} className={`card ${plan.status === 'active' ? '' : 'opacity-50'}`} style={{ border: `2px solid ${plan.status === 'active' ? 'var(--brand-primary)' : 'var(--border-subtle)'}` }}>
            <div className="flex justify-between items-start mb-md">
              <div>
                <div className="heading-lg">{plan.name}</div>
                <div className="body-sm text-muted">{plan.days} · {plan.meals}</div>
              </div>
              <div>
                <span className={`badge ${plan.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{plan.status}</span>
                <div className="heading-md text-brand mt-xs">₹{plan.price}<span className="caption text-muted">/month</span></div>
              </div>
            </div>

            {plan.status === 'active' && (
              <>
                <div className="grid grid-3 gap-sm mb-md" style={{ textAlign: 'center' }}>
                  <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 10 }}>
                    <div className="heading-lg text-success">{plan.used}</div>
                    <div className="caption text-muted">Used</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 10 }}>
                    <div className="heading-lg text-brand">{plan.totalMeals - plan.used - plan.skipped}</div>
                    <div className="caption text-muted">Remaining</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 10 }}>
                    <div className="heading-lg text-warning">{plan.skipped}</div>
                    <div className="caption text-muted">Skipped</div>
                  </div>
                </div>
                <ProgressBar value={plan.used + plan.skipped} max={plan.totalMeals} variant="primary" label="Plan usage" showValue />
                <div className="flex gap-sm mt-md">
                  <button className="btn btn-ghost btn-sm"><Pause size={14} /> Skip Today</button>
                  <button className="btn btn-ghost btn-sm"><SkipForward size={14} /> Pause Plan</button>
                </div>
              </>
            )}

            {plan.status === 'inactive' && (
              <button className="btn btn-primary btn-full"><Play size={16} /> Activate Plan</button>
            )}
          </div>
        ))}
      </div>

      {/* Available Plans */}
      <div className="card">
        <h3 className="heading-lg mb-md">Available Plans</h3>
        <div className="grid grid-3 gap-md">
          {[
            { name: 'Breakfast Only', price: 800, meals: 'Mon–Sat', desc: 'Daily morning breakfast' },
            { name: 'Lunch + Dinner', price: 2400, meals: 'Mon–Fri', desc: 'Both meals, best value' },
            { name: 'Full Board', price: 3200, meals: 'Mon–Sun', desc: 'All 3 meals daily' },
          ].map(plan => (
            <div key={plan.name} className="card" style={{ background: 'var(--bg-elevated)' }}>
              <div className="heading-md mb-xs">{plan.name}</div>
              <div className="body-sm text-muted mb-md">{plan.desc} · {plan.meals}</div>
              <div className="heading-lg text-brand mb-md">₹{plan.price}<span className="caption text-muted">/month</span></div>
              <button className="btn btn-outline btn-full btn-sm">Subscribe</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── QR Tickets Page ──────────────────────────────────────
export function QRTicketsPage() {
  const { myOrders } = useApp();
  const activeOrders = myOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');


  return (
    <div>
      <SectionHeader title="My QR Tickets" subtitle="Show these at the counter to collect your food" />
      {activeOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎫</div>
          <div className="heading-md">No active tickets</div>
          <div className="body-sm text-muted">Place an order to get your QR ticket</div>
        </div>
      ) : (
        <div className="grid grid-2 gap-lg">
          {activeOrders.map(order => (
            <div key={order.id} className="card" style={{ textAlign: 'center' }}>
              <div className="heading-lg text-brand mb-xs">{order.id}</div>
              <div className="body-sm text-secondary mb-md">{order.items.map(i => i.name).join(' + ')}</div>

              <div style={{ display: 'inline-block', background: '#fff', padding: 16, borderRadius: 12, marginBottom: 'var(--space-md)', boxShadow: '0 4px 20px rgba(108,99,255,0.2)' }}>
                <QRCodeSVG
                  value={JSON.stringify({ orderId: order.id, userId: order.userId, slot: order.slotLabel })}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#111221"
                  level="H"
                />
              </div>

              <div className="card-glass" style={{ textAlign: 'left', padding: 12 }}>
                <div className="flex justify-between"><span className="caption text-muted">Slot</span><span className="label">{order.slotLabel}</span></div>
                <div className="flex justify-between"><span className="caption text-muted">Total</span><span className="label text-success">₹{order.total}</span></div>
                <div className="flex justify-between"><span className="caption text-muted">Status</span><span className={`badge badge-sm ${order.status === 'ready' ? 'badge-success' : 'badge-warning'}`}>{order.status}</span></div>
              </div>

              {order.items.some(i => i.counter === 'thali') && (
                <div className="alert alert-info mt-sm" style={{ textAlign: 'left' }}>
                  🍱 Show at Thali Counter
                </div>
              )}
              {order.items.some(i => i.counter === 'dishes') && (
                <div className="alert alert-info mt-sm" style={{ textAlign: 'left' }}>
                  🍴 Show at Dishes Counter
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────
export function ProfilePage() {
  const { currentUser, myOrders } = useApp();
  const totalSpent = myOrders.reduce((s, o) => o.status !== 'cancelled' ? s + o.total : s, 0);
  const avgRating = myOrders.filter(o => o.rating).reduce((s, o) => s + (Object.values(o.rating).reduce((a, b) => a + b, 0) / 4), 0) / (myOrders.filter(o => o.rating).length || 1);

  return (
    <div>
      <SectionHeader title="My Profile" />
      <div className="grid grid-2 gap-lg">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: '#fff', boxShadow: '0 4px 20px rgba(108,99,255,0.4)' }}>
              {currentUser?.avatar}
            </div>
            <div>
              <div className="display-md">{currentUser?.name}</div>
              <div className="body-sm text-muted">{currentUser?.email}</div>
              <span className="badge badge-primary mt-xs">Student · {currentUser?.uid}</span>
            </div>
          </div>

          <div className="grid grid-3 gap-sm" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12 }}>
              <div className="heading-lg text-brand">{myOrders.length}</div>
              <div className="caption text-muted">Total Orders</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12 }}>
              <div className="heading-lg text-success">₹{totalSpent}</div>
              <div className="caption text-muted">Total Spent</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12 }}>
              <div className="heading-lg text-warning">{avgRating.toFixed(1)}⭐</div>
              <div className="caption text-muted">Avg Rating</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {[
              { label: 'Full Name', value: currentUser?.name },
              { label: 'UID', value: currentUser?.uid },
              { label: 'Email', value: currentUser?.email },
              { label: 'Phone', value: currentUser?.phone },
            ].map(({ label, value }) => (
              <div key={label} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" value={value || ''} readOnly style={{ opacity: 0.7 }} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="heading-lg mb-md">Order History</h3>
          {myOrders.map(o => (
            <div key={o.id} className="flex justify-between items-center" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="label text-brand">{o.id}</div>
                <div className="caption text-muted">{new Date(o.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-sm items-center">
                <span className="label">₹{o.total}</span>
                <span className={`badge badge-sm ${o.status === 'completed' ? 'badge-success' : o.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slot Management ──────────────────────────────────────
export function SlotManagement() {
  const { slots } = useApp();
  return (
    <div>
      <SectionHeader title="Pickup Slot Management" subtitle="Configure and monitor capacity per time window" />
      <div className="grid grid-2 gap-md">
        {slots.map(slot => {
          const pct = (slot.booked / slot.capacity) * 100;
          return (
            <div key={slot.id} className="card">
              <div className="flex justify-between items-start mb-md">
                <div>
                  <div className="heading-md">{slot.label}</div>
                  <span className="badge badge-muted">{slot.meal}</span>
                </div>
                <div className="flex gap-sm">
                  <span className={`badge ${pct >= 100 ? 'badge-danger' : pct > 75 ? 'badge-warning' : 'badge-success'}`}>{pct >= 100 ? 'FULL' : `${Math.round(100 - pct)}% free`}</span>
                  <span className={`badge badge-dot ${slot.active ? 'badge-success' : 'badge-muted'}`}>{slot.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <ProgressBar value={slot.booked} max={slot.capacity} variant={pct >= 100 ? 'danger' : pct > 75 ? 'warning' : 'success'} showValue />
              <div className="flex justify-between mt-sm">
                <span className="caption text-muted">Booked: {slot.booked}</span>
                <span className="caption text-muted">Capacity: {slot.capacity}</span>
                <span className="caption text-success">Available: {slot.capacity - slot.booked}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Staff Management ─────────────────────────────────────
export function StaffManagement() {

  return (
    <div>
      <SectionHeader title="Staff Management" subtitle="Manage counter staff and access" actions={<button className="btn btn-primary">Add Staff</button>} />
      <div className="table-container">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {USERS.filter(u => u.role !== 'student').map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td><span className="badge badge-primary">{u.role.replace('_', ' ')}</span></td>
                <td>{u.email}</td>
                <td><span className="badge badge-success badge-dot">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
