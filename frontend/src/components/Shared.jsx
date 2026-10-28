import { useState } from 'react';
import {
  UtensilsCrossed, ShoppingCart, User, Bell, Search,
  LogOut, Menu, X, ChevronRight, Settings, Home,
  ClipboardList, BarChart3, QrCode, Star, Package,
  Clock, Users, Cpu, AlertTriangle, TrendingUp, Zap,
  Store, CreditCard, Sun, Moon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../data/mockData';

// ─── Logo ──────────────────────────────────────────────────
export function Logo({ size = 'md' }) {
  const s = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  return (
    <div className="flex items-center gap-sm">
      <div className="logo-icon" style={{ width: s, height: s, borderRadius: 10, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(108,99,255,0.35)' }}>
        <span style={{ fontSize: s * 0.5 }}>🍽️</span>
      </div>
      <div>
        <div className="logo-text grad-text" style={{ fontSize: size === 'sm' ? '1rem' : size === 'lg' ? '1.5rem' : '1.25rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, lineHeight: 1.1 }}>
          MealSync
        </div>
        {size !== 'sm' && <div className="caption text-muted" style={{ marginTop: 0 }}>Smart Campus Mess</div>}
      </div>
    </div>
  );
}

// ─── User Avatar ───────────────────────────────────────────
export function Avatar({ name, size = 36, color = 'primary' }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = {
    primary: 'var(--grad-primary)', success: 'var(--grad-success)',
    warning: 'var(--grad-warning)', info: 'var(--grad-info)',
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colors[color] || colors.primary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.35, color: '#fff',
      flexShrink: 0, boxShadow: '0 2px 8px rgba(108,99,255,0.3)',
    }}>
      {initials}
    </div>
  );
}

// ─── Badge ─────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pending_payment: { label: 'Pending Payment', cls: 'badge-warning' },
    confirmed: { label: 'Confirmed', cls: 'badge-info' },
    preparing: { label: 'Preparing', cls: 'badge-warning' },
    ready: { label: 'Ready', cls: 'badge-success' },
    partially_served: { label: 'Partial', cls: 'badge-orange' },
    completed: { label: 'Completed', cls: 'badge-success' },
    cancelled: { label: 'Cancelled', cls: 'badge-danger' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'badge-muted' };
  return <span className={`badge badge-dot ${cls}`}>{label}</span>;
}

// ─── Topbar ────────────────────────────────────────────────
export function Topbar({ onMenuToggle }) {
  const { currentUser, unreadCount, notifications, markAllRead, logout, theme, toggleTheme } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="btn btn-ghost btn-icon" onClick={onMenuToggle} style={{ display: 'none' }}>
          <Menu size={18} />
        </button>
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input placeholder="Search orders, menu items..." value={searchVal} onChange={e => setSearchVal(e.target.value)} />
        </div>
      </div>

      <div className="topbar-right">
        {/* Light / Dark Mode Toggle */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{ color: theme === 'dark' ? 'var(--color-warning)' : 'var(--brand-primary)' }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button className="notification-btn" onClick={() => setShowNotifs(v => !v)}>
            <Bell size={18} />
            {unreadCount > 0 && <div className="notification-dot" />}
          </button>
          {showNotifs && (
            <div style={{
              position: 'absolute', top: '120%', right: 0, width: 340,
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
              zIndex: 200, overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="heading-sm">Notifications {unreadCount > 0 && <span className="badge badge-primary badge-dot" style={{ marginLeft: 8 }}>{unreadCount}</span>}</span>
                <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                    background: n.read ? 'transparent' : 'rgba(108,99,255,0.05)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                      background: n.read ? 'var(--text-muted)' : 'var(--brand-primary)',
                    }} />
                    <div>
                      <div className="heading-sm">{n.title}</div>
                      <div className="body-sm text-secondary" style={{ marginTop: 2 }}>{n.message}</div>
                      <div className="caption text-muted" style={{ marginTop: 4 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-sm">
          <Avatar name={currentUser?.name} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="label text-primary" style={{ fontSize: '0.8125rem' }}>{currentUser?.name}</span>
            <span className="caption text-muted">{currentUser?.uid || currentUser?.email?.split('@')[0]}</span>
          </div>
        </div>

        <button className="btn btn-ghost btn-icon" onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, badge, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={18} className="nav-icon" />
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && <span className="nav-badge">{badge}</span>}
    </div>
  );
}

export function Sidebar({ currentPage, setPage }) {
  const { currentUser, cartCount, activeOrders } = useApp();
  const role = currentUser?.role;

  const studentNav = [
    { key: 'dashboard', label: 'Dashboard', icon: Home },
    { key: 'menu', label: 'Live Menu', icon: UtensilsCrossed },
    { key: 'order', label: 'Place Order', icon: ShoppingCart, badge: cartCount },
    { key: 'my-orders', label: 'My Orders', icon: ClipboardList, badge: activeOrders.length },
    { key: 'qr', label: 'My QR Tickets', icon: QrCode },
    { key: 'subscription', label: 'Subscription', icon: Star },
    { key: 'profile', label: 'My Profile', icon: User },
  ];

  const adminNav = [
    { key: 'admin-dashboard', label: 'Overview', icon: Home },
    { key: 'counter-sale', label: 'Counter Sale', icon: Store },
    { key: 'payment-records', label: 'Payment Records', icon: CreditCard },
    { key: 'admin-orders', label: 'Order Management', icon: ClipboardList },
    { key: 'menu-mgmt', label: 'Product Catalog', icon: UtensilsCrossed },
    { key: 'slot-mgmt', label: 'Pickup Slots', icon: Clock },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'forecasting', label: 'Demand Forecast', icon: TrendingUp },
    { key: 'monitoring', label: 'Cloud Monitoring', icon: Cpu },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const nav = role === ROLES.ADMIN ? adminNav : studentNav;
  const roleLabel = role === ROLES.ADMIN ? 'Mess Admin' : 'Student';
  const roleColor = role === ROLES.ADMIN ? 'badge-danger' : 'badge-primary';

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <Logo />
      </div>

      {/* Role Indicator */}
      <div style={{ padding: '12px var(--space-lg)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-sm">
          <Avatar name={currentUser?.name} size={32} />
          <div>
            <div className="label text-primary" style={{ fontSize: '0.8rem' }}>{currentUser?.name}</div>
            <span className={`badge ${roleColor}`} style={{ fontSize: '0.65rem', marginTop: 2 }}>{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-section-label">Navigation</div>
        {nav.map(item => (
          <NavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            active={currentPage === item.key}
            badge={item.badge}
            onClick={() => setPage(item.key)}
          />
        ))}
      </div>

      {/* College Info */}
      <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="card-glass" style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
          <div className="caption text-muted">SPIT Mumbai</div>
          <div className="label text-secondary" style={{ marginTop: 2 }}>Lunch • 12:30–1:30 PM</div>
          <div className="flex items-center gap-xs" style={{ marginTop: 6 }}>
            <div className="status-dot online pulse" />
            <span className="caption text-success">Ordering Open</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, variant = 'primary', sub, trend }) {
  return (
    <div className={`stat-card ${variant}`}>
      <div className="flex justify-between items-start mb-md">
        <div>
          <div className="caption text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>{value}</div>
          {sub && <div className="caption text-secondary" style={{ marginTop: 4 }}>{sub}</div>}
        </div>
        <div className={`stat-icon ${variant}`}>
          <Icon size={22} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-xs">
          <TrendingUp size={12} color={trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
          <span className="caption" style={{ color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {trend >= 0 ? '+' : ''}{trend}% vs yesterday
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────
export function EmptyState({ icon = '📋', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div>
        <div className="heading-md" style={{ marginBottom: 4 }}>{title}</div>
        <div className="body-sm text-muted">{message}</div>
      </div>
      {action}
    </div>
  );
}

// ─── Progress Bar Component ────────────────────────────────
export function ProgressBar({ value, max = 100, variant = 'primary', label, showValue = false }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-xs">
          {label && <span className="caption text-muted">{label}</span>}
          {showValue && <span className="caption text-secondary">{value}/{max}</span>}
        </div>
      )}
      <div className="progress-bar">
        <div className={`progress-fill ${variant}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Alert Banner ──────────────────────────────────────────
export function AlertBanner({ type = 'info', message, icon: Icon }) {
  return (
    <div className={`alert alert-${type}`}>
      {Icon && <Icon size={16} style={{ flexShrink: 0, marginTop: 2 }} />}
      <span>{message}</span>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────
export function SectionHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && <Icon size={28} color="var(--brand-primary)" />}
          {title}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

// ─── Slot Availability Bar ─────────────────────────────────
export function SlotPicker({ slots, selected, onSelect }) {
  return (
    <div className="grid grid-2 gap-sm">
      {slots.map(slot => {
        const isFull = slot.booked >= slot.capacity;
        const pct = (slot.booked / slot.capacity) * 100;
        const isSelected = selected === slot.id;
        return (
          <div
            key={slot.id}
            className={`slot-card ${isFull ? 'full' : ''} ${isSelected ? 'selected' : ''}`}
            onClick={() => !isFull && onSelect(slot.id)}
          >
            <div className="heading-sm" style={{ marginBottom: 4 }}>{slot.label}</div>
            <ProgressBar value={slot.booked} max={slot.capacity} variant={isFull ? 'danger' : pct > 75 ? 'warning' : 'success'} />
            <div className="caption text-muted" style={{ marginTop: 6 }}>
              {isFull ? '🚫 Full' : `${slot.capacity - slot.booked} spots left`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Order Timeline ────────────────────────────────────────
export function OrderTimeline({ order }) {
  const steps = [
    { key: 'confirmed', label: 'Order Confirmed', icon: '✓' },
    { key: 'payment', label: 'Payment Confirmed', icon: '₹' },
    { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
    { key: 'ready', label: 'Ready for Pickup', icon: '🔔' },
    { key: 'completed', label: 'Collected', icon: '✅' },
  ];

  const statusOrder = ['confirmed', 'confirmed', 'preparing', 'ready', 'completed'];
  const currentIdx = statusOrder.indexOf(
    order.status === 'partially_served' ? 'preparing' : order.status
  );

  return (
    <div className="order-timeline">
      {steps.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        const isPending = idx > currentIdx;
        return (
          <div key={step.key}>
            <div className="timeline-step">
              <div className={`timeline-icon ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
                {step.icon}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div className={`label ${isDone ? 'text-success' : isActive ? 'text-brand' : 'text-muted'}`}>{step.label}</div>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`timeline-connector ${isDone ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
