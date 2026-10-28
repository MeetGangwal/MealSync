import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { SectionHeader, ProgressBar } from '../components/Shared';
import { Star, Package, Pause, Play, SkipForward, Search, Edit3, Save, X, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export function LiveMenuPage({ setPage }) {
  const { menuItems } = useApp();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const categories = [
    { key: 'all', label: 'All Items', icon: '🍽️' },
    { key: 'thali', label: 'Thalis & Combos', icon: '🍱' },
    { key: 'snacks', label: 'Snacks & Quick Bites', icon: '🍔' },
    { key: 'south-indian', label: 'South Indian & Breakfast', icon: '🥞' },
    { key: 'meals', label: 'Rice Bowls & Meals', icon: '🍛' },
    { key: 'beverages', label: 'Beverages', icon: '🥤' },
  ];

  const filtered = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = category === 'all' || item.category === category;
      const matchSearch = !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [menuItems, category, search]);

  return (
    <div>
      <SectionHeader
        title="Live Campus Menu"
        subtitle="Real-time kitchen inventory for our single food counter"
        actions={
          <div className="flex items-center gap-sm">
            <div className="status-dot online pulse" />
            <span className="body-sm text-success">Live Kitchen Sync</span>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex gap-md mb-lg flex-wrap items-center">
        <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
          <Search size={16} className="search-icon" />
          <input
            placeholder="Search live menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="tab-list" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {categories.map(c => (
            <div
              key={c.key}
              className={`tab-item ${category === c.key ? 'active' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              <span style={{ marginRight: 6 }}>{c.icon}</span>
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-3 gap-md">
        {filtered.map(item => (
          <LiveMenuItem key={item.id} item={item} onOrder={() => setPage('order')} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>🍲</div>
          <div className="heading-md mb-xs">No items found</div>
          <div className="body-sm text-muted">Try selecting a different category or clearing your search term.</div>
        </div>
      )}
    </div>
  );
}

function LiveMenuItem({ item, onOrder }) {
  const soldOut = !item.available || item.qty === 0;
  const initial = item.initialQty || 100;
  const pct = Math.min(100, Math.round((item.qty / initial) * 100));
  const variant = soldOut ? 'danger' : pct < 25 ? 'warning' : 'success';

  return (
    <div className={`card ${soldOut ? 'opacity-50' : ''}`} style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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

      <div>
        <div style={{ fontSize: '2.8rem', marginBottom: 'var(--space-sm)', textAlign: 'center' }}>{item.emoji || '🍽️'}</div>
        <div className="heading-md mb-xs" style={{ textAlign: 'center' }}>{item.name}</div>
        <div className="caption text-muted mb-md" style={{ textAlign: 'center', minHeight: 36, lineHeight: 1.4 }}>
          {item.description}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-md">
          <span className="display-md text-brand">₹{item.price}</span>
          <span className="caption text-muted">⭐ {item.rating || '4.5'}</span>
        </div>

        <div className="mb-sm">
          <div className="flex justify-between caption mb-xs">
            <span className="text-muted">Kitchen Stock</span>
            <span className={soldOut ? 'text-danger' : pct < 25 ? 'text-warning' : 'text-success'}>
              {soldOut ? '0 available' : `${item.qty} left`}
            </span>
          </div>
          <ProgressBar value={item.qty} max={initial} variant={variant} />
        </div>

        <button
          className={`btn btn-full ${soldOut ? 'btn-ghost' : 'btn-primary'}`}
          disabled={soldOut}
          onClick={onOrder}
          style={{ marginTop: 'var(--space-sm)' }}
        >
          {soldOut ? 'Sold Out' : 'Order Now →'}
        </button>
      </div>
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
  const { currentUser, myOrders, updateProfile, orderFetchError, fetchOrders } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [uid, setUid] = useState(currentUser?.uid || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Start editing and reset form state to current user values
  const handleStartEdit = () => {
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone || '');
    setUid(currentUser?.uid || '');
    setErrorMsg('');
    setSuccessMsg('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await updateProfile({
      name: name.trim(),
      phone: phone.trim(),
      uid: uid.trim(),
    });

    setIsSaving(false);
    if (res.success) {
      setSuccessMsg('Profile updated and saved to MySQL successfully!');
      setIsEditing(false);
    } else {
      setErrorMsg(res.error || 'Failed to update profile.');
    }
  };

  // Real statistics derived from database orders
  const totalSpent = myOrders.reduce((s, o) => {
    const isCancelled = o.status?.toUpperCase() === 'CANCELLED';
    const isFailed = o.paymentStatus?.toUpperCase() === 'PAYMENT_FAILED';
    return (!isCancelled && !isFailed) ? s + (o.total || 0) : s;
  }, 0);

  const initialLetter = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  return (
    <div>
      <SectionHeader
        title="My Profile"
        subtitle="Manage your campus account details and view verified meal transactions"
        actions={
          !isEditing ? (
            <button className="btn btn-primary" onClick={handleStartEdit}>
              <Edit3 size={15} /> Edit Profile
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={handleCancelEdit} disabled={isSaving}>
              <X size={15} /> Cancel
            </button>
          )
        }
      />

      {successMsg && (
        <div className="alert alert-success mb-lg">
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger mb-lg">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {orderFetchError && (
        <div className="alert alert-warning mb-lg flex justify-between items-center">
          <div className="flex items-center gap-sm">
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{orderFetchError}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchOrders}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-2 gap-lg">
        {/* Left Column: Profile Card & Edit Form */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#fff', boxShadow: '0 4px 20px rgba(108,99,255,0.4)', flexShrink: 0 }}>
              {initialLetter}
            </div>
            <div>
              <div className="display-md">{currentUser?.name}</div>
              <div className="body-sm text-muted">{currentUser?.email}</div>
              <span className="badge badge-primary mt-xs" style={{ fontSize: '0.75rem' }}>
                {currentUser?.role === 'ROLE_ADMIN' || currentUser?.role === 'admin' ? 'Mess Admin' : 'Student'}
                {currentUser?.uid ? ` · UID: ${currentUser.uid}` : ''}
              </span>
            </div>
          </div>

          {/* Real Statistics from Persisted Orders */}
          <div className="grid grid-2 gap-sm" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12 }}>
              <div className="heading-lg text-brand">{myOrders.length}</div>
              <div className="caption text-muted">Total Orders</div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 16, borderRadius: 12 }}>
              <div className="heading-lg text-success">₹{totalSpent}</div>
              <div className="caption text-muted">Total Spent</div>
            </div>
          </div>

          {/* Profile Form (View or Edit mode) */}
          {!isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={currentUser?.name || ''} readOnly style={{ opacity: 0.85 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Student / Staff UID</label>
                <input className="form-input" value={currentUser?.uid || 'Not Set'} readOnly style={{ opacity: 0.85 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Login ID)</label>
                <input className="form-input" value={currentUser?.email || ''} readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={currentUser?.phone || 'Not Set'} readOnly style={{ opacity: 0.85 }} />
              </div>
              <button className="btn btn-ghost btn-full mt-sm" onClick={handleStartEdit}>
                <Edit3 size={15} /> Edit My Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Student UID (Campus ID)</label>
                <input
                  className="form-input"
                  value={uid}
                  onChange={e => setUid(e.target.value)}
                  placeholder="e.g. 2025510014"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  value={currentUser?.email || ''}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
                <span className="caption text-muted" style={{ fontSize: '0.7rem' }}>Email cannot be changed to prevent account impersonation.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div className="flex gap-sm mt-md">
                <button type="button" className="btn btn-ghost flex-1" onClick={handleCancelEdit} disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={isSaving}>
                  {isSaving ? (
                    <span className="flex items-center gap-xs justify-center">
                      <RefreshCw size={15} className="animate-spin" /> Saving…
                    </span>
                  ) : (
                    <span className="flex items-center gap-xs justify-center">
                      <Save size={15} /> Save Changes
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Persisted Order History */}
        <div className="card">
          <div className="flex justify-between items-center mb-md">
            <h3 className="heading-lg">Order History</h3>
            <span className="caption text-muted">{myOrders.length} records</span>
          </div>

          {myOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-md)', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📜</div>
              <div className="heading-sm mb-xs">No orders yet</div>
              <p className="caption">Orders placed through the campus food portal will appear here.</p>
            </div>
          ) : (
            <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
              {myOrders.map(o => (
                <div key={o.id} className="flex justify-between items-center" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="flex items-center gap-xs">
                      <span className="label text-brand">{o.id}</span>
                      <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{o.payMethod || 'UPI'}</span>
                    </div>
                    <div className="caption text-muted" style={{ marginTop: 2 }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : 'Recent'} · {o.slotLabel || 'Counter'}
                    </div>
                  </div>
                  <div className="flex gap-sm items-center">
                    <span className="label" style={{ fontWeight: 700 }}>₹{o.total}</span>
                    <span className={`badge badge-sm ${
                      o.status?.toLowerCase() === 'completed' ? 'badge-success' :
                      o.status?.toLowerCase() === 'cancelled' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {o.status || 'CONFIRMED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
