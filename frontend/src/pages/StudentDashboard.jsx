import { useState } from 'react';
import { ShoppingCart, TrendingUp, Clock, Star, Package, Bell, ChevronRight, Zap, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard, StatusBadge, AlertBanner, SectionHeader } from '../components/Shared';
import { ORDER_STATUS } from '../data/mockData';
import OrderPage from './OrderPage';

export default function StudentDashboard({ setPage }) {
  const { currentUser, menuItems, slots, myOrders, activeOrders, cartCount, notifications, unreadCount } = useApp();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const completedToday = myOrders.filter(o => o.status === ORDER_STATUS.COMPLETED).length;
  const totalSpent = myOrders.reduce((s, o) => o.status !== ORDER_STATUS.CANCELLED ? s + o.total : s, 0);
  const availableSlots = slots.filter(s => s.booked < s.capacity);
  const lowStockItems = menuItems.filter(i => i.available && i.qty > 0 && i.qty < 30);
  const soldOutItems = menuItems.filter(i => !i.available || i.qty === 0);

  return (
    <div>
      {/* Hero greeting */}
      <div className="hero-gradient" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-xl)', background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.15), transparent)', pointerEvents: 'none' }} />
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div className="caption text-muted mb-xs">{greeting}! 👋</div>
            <h1 className="display-md" style={{ marginBottom: 6 }}>{currentUser?.name}</h1>
            <div className="flex items-center gap-sm">
              <div className="status-dot online pulse" />
              <span className="body-sm text-success">Lunch ordering is OPEN</span>
            </div>
          </div>
          <div className="flex gap-sm flex-wrap">
            <button className="btn btn-primary btn-lg" onClick={() => setPage('order')}>
              <ShoppingCart size={18} /> Order Now
            </button>
            <button className="btn btn-ghost" onClick={() => setPage('menu')}>
              View Menu
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {lowStockItems.length > 0 && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <AlertBanner
            type="warning"
            icon={AlertTriangle}
            message={`⚠️ ${lowStockItems.map(i => i.name).join(', ')} running low! Order now.`}
          />
        </div>
      )}

      {unreadCount > 0 && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <AlertBanner type="info" icon={Bell} message={`You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-4 mb-xl">
        <StatCard label="Active Orders" value={activeOrders.length} icon={ShoppingCart} variant="primary" />
        <StatCard label="Meals Today" value={completedToday} icon={Star} variant="success" />
        <StatCard label="Total Spent" value={`₹${totalSpent}`} icon={TrendingUp} variant="warning" />
        <StatCard label="Cart Items" value={cartCount} icon={Package} variant="info" sub="Ready to order" />
      </div>

      <div className="grid grid-2 gap-lg">
        {/* Pickup Slots */}
        <div className="card">
          <div className="flex justify-between items-center mb-md">
            <h2 className="heading-lg flex items-center gap-sm"><Clock size={20} color="var(--brand-primary)" /> Pickup Slots</h2>
            <span className="badge badge-success badge-dot">Live</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {slots.filter(s => s.meal === 'lunch').map(slot => {
              const pct = (slot.booked / slot.capacity) * 100;
              const isFull = slot.booked >= slot.capacity;
              return (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <div className="label">{slot.label}</div>
                    <div className="caption text-muted">{slot.capacity - slot.booked} spots remaining</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isFull ? <span className="badge badge-danger">FULL</span> : <span className="badge badge-success">{Math.round(100 - pct)}% free</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn btn-outline btn-full" style={{ marginTop: 'var(--space-md)' }} onClick={() => setPage('order')}>
            Book a Slot <ChevronRight size={16} />
          </button>
        </div>

        {/* Today's Menu Preview */}
        <div className="card">
          <div className="flex justify-between items-center mb-md">
            <h2 className="heading-lg">Today's Menu</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('menu')}>View All</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {menuItems.slice(0, 6).map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
                  <div>
                    <div className="label">{item.name}</div>
                    <div className="caption text-muted">{item.available && item.qty > 0 ? `${item.qty} remaining` : 'SOLD OUT'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="heading-sm text-brand">₹{item.price}</span>
                  {(!item.available || item.qty === 0) && <span className="badge badge-danger badge-sm">Sold Out</span>}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-md)' }} onClick={() => setPage('order')}>
            <ShoppingCart size={16} /> Order Now
          </button>
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="flex justify-between items-center mb-md">
            <h2 className="heading-lg">Recent Orders</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('my-orders')}>View All</button>
          </div>
          {myOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <div className="empty-icon">📋</div>
              <div className="heading-md">No orders yet</div>
              <div className="body-sm text-muted">Place your first order and skip the queue!</div>
              <button className="btn btn-primary" onClick={() => setPage('order')}>Order Now</button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr>
                  <th>Order ID</th><th>Items</th><th>Total</th><th>Pickup Slot</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {myOrders.slice(0, 4).map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{o.id}</td>
                      <td>{o.items.map(i => i.name).join(', ')}</td>
                      <td>₹{o.total}</td>
                      <td>{o.slotLabel}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => setPage('my-orders')}>View <ChevronRight size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
