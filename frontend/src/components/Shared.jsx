import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  UtensilsCrossed, ShoppingBag, User, Bell, LogOut, Menu, X, Home,
  ClipboardList, BarChart3, QrCode, CalendarCheck, Clock, Activity, TrendingUp, Store,
  CreditCard, Sun, Moon, ShieldCheck, UserCog, Inbox, Check, Wallet, ChefHat, PackageCheck,
  CircleCheck, CircleAlert, Info, ImageOff, ChevronRight, Ban,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { accountLabel } from '../lib/session';
import { menuImageFor, photoCredits } from '../lib/menuImages';
import { slotHasEnded } from '../lib/slots';

// ─── Logo ──────────────────────────────────────────────────
export function Logo({ size = 'md', sub = false }) {
  const box = size === 'sm' ? 28 : size === 'lg' ? 40 : 32;
  return (
    <span className="logo">
      <span className="logo-mark" style={{ width: box, height: box }} aria-hidden="true">
        <UtensilsCrossed size={Math.round(box * 0.5)} strokeWidth={2.25} />
      </span>
      <span>
        <span className={`logo-text logo-text-${size}`} style={{ display: 'block' }}>MealSync</span>
        {sub && <span className="logo-sub">Campus mess</span>}
      </span>
    </span>
  );
}

// ─── User Avatar ───────────────────────────────────────────
export function Avatar({ name, size = 36 }) {
  const initials = name?.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initials}
    </span>
  );
}

// ─── Status Badge (label text always shown — never colour alone) ──
const STATUS = {
  pending_payment: { label: 'Pending payment', cls: 'badge-warning' },
  confirmed: { label: 'Confirmed', cls: 'badge-info' },
  preparing: { label: 'Preparing', cls: 'badge-warning' },
  ready: { label: 'Ready for pickup', cls: 'badge-primary' },
  partially_served: { label: 'Partly served', cls: 'badge-warning' },
  completed: { label: 'Collected', cls: 'badge-success' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
};
export function statusLabel(status) {
  return STATUS[String(status || '').toLowerCase()]?.label || status || 'Unknown';
}
export function StatusBadge({ status }) {
  const { label, cls } = STATUS[String(status || '').toLowerCase()] || { label: status || 'Unknown', cls: 'badge-muted' };
  return <span className={`badge badge-dot ${cls}`}>{label}</span>;
}

// ─── Navigation model (also used for page titles) ──────────
export const CUSTOMER_NAV = [
  { key: 'dashboard', label: 'Home', icon: Home },
  { key: 'menu', label: "Today's menu", icon: UtensilsCrossed },
  { key: 'order', label: 'Place order', icon: ShoppingBag, badge: 'cart' },
  { key: 'my-orders', label: 'My orders', icon: ClipboardList, badge: 'active' },
  { key: 'qr', label: 'QR tickets', icon: QrCode },
  { key: 'subscription', label: 'Meal plans', icon: CalendarCheck },
  { key: 'profile', label: 'Profile', icon: User },
];
export const ADMIN_NAV = [
  { key: 'admin-dashboard', label: 'Overview', icon: Home },
  { key: 'admin-orders', label: 'Order queue', icon: ClipboardList },
  { key: 'counter-sale', label: 'Counter sale', icon: Store },
  { key: 'payment-records', label: 'Payment records', icon: CreditCard },
  { key: 'menu-mgmt', label: 'Product catalog', icon: UtensilsCrossed },
  { key: 'slot-mgmt', label: 'Pickup slots', icon: Clock },
  { key: 'user-mgmt', label: 'Users & roles', icon: UserCog },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'forecasting', label: 'Demand forecast', icon: TrendingUp },
  { key: 'monitoring', label: 'Monitoring', icon: Activity },
];
export function pageLabel(key) {
  return [...ADMIN_NAV, ...CUSTOMER_NAV].find(i => i.key === key)?.label || '';
}

// ─── Topbar ────────────────────────────────────────────────
export function Topbar({ onMenuToggle, navOpen, currentPage }) {
  const { currentUser, unreadCount, notifications, markAllRead, logout, theme, toggleTheme } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const panelRef = useRef(null);
  const isAdminPage = ADMIN_NAV.some(i => i.key === currentPage);

  // Close the notification panel on outside click or Escape
  useEffect(() => {
    if (!showNotifs) return undefined;
    const onDown = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifs(false); };
    const onKey = (e) => { if (e.key === 'Escape') setShowNotifs(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [showNotifs]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="btn btn-ghost btn-icon menu-toggle" onClick={onMenuToggle}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={Boolean(navOpen)}>
          {navOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="topbar-brand"><Logo size="sm" /></span>
        {currentPage && (
          <span className="topbar-title">
            {currentUser?.isAdmin ? (isAdminPage ? 'Mess administration' : 'My meals') : 'MealSync'}
            {' / '}<strong>{pageLabel(currentPage)}</strong>
          </span>
        )}
      </div>

      <div className="topbar-right">
        <button type="button" className="btn btn-ghost btn-icon" onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="popover-anchor" ref={panelRef}>
          <button type="button" className="btn btn-ghost btn-icon notification-btn"
            onClick={() => setShowNotifs(v => !v)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={showNotifs} aria-haspopup="dialog">
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-dot" aria-hidden="true" />}
          </button>
          {showNotifs && (
            <div className="popover" role="dialog" aria-label="Notifications">
              <div className="popover-header">
                <span className="heading-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all as read</button>
                )}
              </div>
              <div className="popover-body">
                {notifications.length === 0 && (
                  <p className="body-sm text-muted p-md">Order confirmations from this session appear here.</p>
                )}
                {notifications.map(n => (
                  <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
                    <div className="heading-sm">{n.title}</div>
                    <div className="body-sm text-secondary">{n.message}</div>
                    <div className="caption text-muted">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="topbar-user">
          <Avatar name={currentUser?.name} size={32} />
          <div className="topbar-user-text">
            <span className="label text-primary truncate">{currentUser?.name}</span>
            <span className="caption text-muted">{accountLabel(currentUser)}</span>
          </div>
        </div>

        <button type="button" className="btn btn-ghost btn-icon" onClick={logout} aria-label="Sign out" title="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

// ─── Sidebar ───────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, badge, onClick }) {
  return (
    <button type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <Icon size={18} className="nav-icon" aria-hidden="true" />
      <span className="nav-label">{label}</span>
      {badge > 0 && <span className="nav-badge"><span className="sr-only">(</span>{badge}<span className="sr-only">)</span></span>}
    </button>
  );
}

export function Sidebar({ currentPage, setPage }) {
  const { currentUser, cartCount, activeOrders } = useApp();
  const [showCredits, setShowCredits] = useState(false);
  const badges = { cart: cartCount, active: activeOrders.length };

  const sections = currentUser?.isAdmin
    ? [{ label: 'Mess administration', items: ADMIN_NAV }, { label: 'My meals', items: CUSTOMER_NAV }]
    : [{ label: 'Menu & orders', items: CUSTOMER_NAV }];

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="sidebar-logo"><Logo /></div>

      <div className="sidebar-account">
        <Avatar name={currentUser?.name} size={32} />
        <div className="sidebar-account-text">
          <div className="label text-primary truncate" style={{ maxWidth: 150 }}>{currentUser?.name}</div>
          <span className="caption text-muted" style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            {currentUser?.isAdmin && <ShieldCheck size={12} aria-hidden="true" />} {accountLabel(currentUser)}
          </span>
        </div>
      </div>

      <div className="sidebar-scroll">
        {sections.map(section => (
          <div className="sidebar-section" key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(item => (
              <NavItem key={item.key} icon={item.icon} label={item.label}
                active={currentPage === item.key} badge={badges[item.badge]} onClick={() => setPage(item.key)} />
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button type="button" className="btn btn-link btn-sm" style={{ justifyContent: 'flex-start', color: 'var(--text-muted)' }}
          onClick={() => setShowCredits(true)}>Photo credits</button>
      </div>
      {showCredits && <PhotoCreditsDialog onClose={() => setShowCredits(false)} />}
    </nav>
  );
}

// ─── Stat Card ─────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, variant = 'primary', sub, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <div className="stat-card-text">
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
        </div>
        {Icon && <div className={`stat-icon ${variant}`} aria-hidden="true"><Icon size={18} /></div>}
      </div>
      {sub && <div className="caption text-secondary">{sub}</div>}
      {trend !== undefined && (
        <div className={`caption ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs previous period
        </div>
      )}
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────
export function EmptyState({ icon, title, message, action }) {
  const Icon = typeof icon === 'function' || (icon && typeof icon === 'object') ? icon : Inbox;
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true"><Icon size={20} /></div>
      <div className="flex flex-col items-center gap-xs">
        <div className="heading-md">{title}</div>
        {message && <p className="body-sm text-muted">{message}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Progress Bar ──────────────────────────────────────────
export function ProgressBar({ value, max = 100, variant = 'primary', label, ariaLabel, showValue = false }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-xs">
          {label && <span className="caption text-muted">{label}</span>}
          {showValue && <span className="caption text-secondary tabular">{value}/{max}</span>}
        </div>
      )}
      <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={ariaLabel || label || 'Progress'}>
        <div className={`progress-fill ${variant}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Alert Banner ──────────────────────────────────────────
export function AlertBanner({ type = 'info', message, icon: Icon }) {
  return (
    <div className={`alert alert-${type}`} role={type === 'danger' ? 'alert' : 'status'}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}

// ─── Section Header (page title, optional breadcrumb) ──────
export function SectionHeader({ title, subtitle, actions, icon: Icon, breadcrumb }) {
  return (
    <div className="page-header">
      <div className="page-header-left">
        {breadcrumb && (
          <nav className="breadcrumb" aria-label="Breadcrumb">
            {breadcrumb.map((b, i) => (
              <span key={b.label} className="flex items-center gap-xs">
                {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
                {b.onClick ? <button type="button" onClick={b.onClick}>{b.label}</button> : <span aria-current="page">{b.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <h1>
          {Icon && <Icon size={22} aria-hidden="true" />}
          {title}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

// ─── Food image with graceful fallback ─────────────────────
/** Photo of a menu item. Missing or broken images fall back to a neutral tile (never a different dish). */
export function MealImage({ item, src, alt, className = '', eager = false, showLabel = true }) {
  const url = src || menuImageFor(item);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`meal-img ${className}`}>
      {url && !failed ? (
        <img src={url} alt={alt ?? item?.name ?? ''} loading={eager ? 'eager' : 'lazy'} decoding="async"
          width={800} height={600} className={loaded ? 'is-loaded' : ''}
          onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      ) : (
        <div className="meal-fallback" role={alt === '' ? undefined : 'img'} aria-label={alt === '' ? undefined : `${item?.name || 'Dish'} — no photo`}>
          <ImageOff size={18} aria-hidden="true" />
          {showLabel && <span>No photo yet</span>}
        </div>
      )}
    </div>
  );
}

// ─── Pickup Slot Picker (grouped by meal period) ───────────
const PERIOD_ORDER = ['breakfast', 'lunch', 'dinner'];

export function SlotPicker({ slots, selected, onSelect }) {
  const groups = PERIOD_ORDER
    .map(p => ({ period: p, items: slots.filter(s => (s.mealPeriod || s.meal) === p) }))
    .concat([{ period: 'other', items: slots.filter(s => !PERIOD_ORDER.includes(s.mealPeriod || s.meal)) }])
    .filter(g => g.items.length > 0);

  return (
    <div role="radiogroup" aria-label="Pickup slot">
      {groups.map(g => (
        <div className="slot-group" key={g.period}>
          {groups.length > 1 && <div className="slot-group-label caption text-muted capitalize">{g.period}</div>}
          <div className="slot-grid">
            {g.items.map(slot => {
              const remaining = Math.max(0, slot.capacity - slot.booked);
              const ended = slotHasEnded(slot);
              const isFull = remaining === 0 || ended;
              const pct = slot.capacity > 0 ? (slot.booked / slot.capacity) * 100 : 100;
              const isSelected = selected === slot.id;
              return (
                <button type="button" key={slot.id} role="radio" aria-checked={isSelected} disabled={isFull}
                  className={`slot-card ${isFull ? 'full' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelect(slot.id)}
                  aria-label={`${slot.label}, ${ended ? 'ended' : isFull ? 'full' : `${remaining} places left`}`}>
                  <span className="slot-card-top">
                    <span className="heading-sm">{slot.label}</span>
                    {isSelected && <Check size={14} className="text-brand" aria-hidden="true" />}
                  </span>
                  <ProgressBar value={slot.booked} max={slot.capacity} variant={isFull ? 'danger' : pct > 75 ? 'warning' : 'primary'} />
                  <span className="caption text-muted">{ended ? 'Ended' : isFull ? 'Full' : `${remaining} places left`}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Order status timeline (reflects the stored status only) ──
export function OrderTimeline({ order }) {
  const status = String(order.status || '').toLowerCase();
  if (status === 'cancelled') {
    return (
      <div className="alert alert-danger"><Ban size={16} aria-hidden="true" />
        <span>This order was cancelled{order.paymentStatus === 'REFUNDED' ? ' and the payment refunded' : ''}.</span></div>
    );
  }
  const isCash = order.paymentStatus === 'PENDING_CASH';
  const steps = [
    { key: 'confirmed', label: 'Order confirmed', icon: Check },
    { key: 'payment', label: isCash ? 'Pay in cash at pickup' : 'Payment received', icon: Wallet },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready', label: 'Ready for pickup', icon: Bell },
    { key: 'completed', label: 'Collected', icon: PackageCheck },
  ];
  // Steps finished for each stored status (online payment is settled when the order is confirmed;
  // cash is settled at hand-over). Only a status that names a step marks that step as current.
  const doneCount = { pending_payment: 1, confirmed: 2, preparing: 2, partially_served: 2, ready: 3, completed: 5 }[status] ?? 0;
  const currentIdx = { preparing: 2, partially_served: 2, ready: 3 }[status] ?? -1;

  return (
    <ol className="order-timeline" aria-label="Order progress">
      {steps.map((step, idx) => {
        const isDone = idx < doneCount && !(step.key === 'payment' && isCash && status !== 'completed');
        const isActive = idx === currentIdx;
        const StepIcon = step.icon;
        return (
          <li key={step.key} className={`timeline-step ${isDone ? 'done' : ''}`}>
            <span className={`timeline-icon ${isDone ? 'done' : isActive ? 'active' : ''}`} aria-hidden="true"><StepIcon size={14} /></span>
            <span className={`label ${isDone ? 'text-primary' : isActive ? 'text-brand' : 'text-muted'}`}>
              {step.label}<span className="sr-only">{isDone ? ' (done)' : isActive ? ' (current)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Modal / dialog ────────────────────────────────────────
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal dialog: traps focus, closes on Escape, restores focus to the opener and locks page scroll. */
export function Modal({ title, onClose, children, footer, labelledBy, size }) {
  const autoId = useId();
  const titleId = labelledBy || `dialog-${autoId}`;
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = ref.current?.querySelector('[data-autofocus]') || ref.current;
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const nodes = [...ref.current.querySelectorAll(FOCUSABLE)];
      if (nodes.length === 0) { e.preventDefault(); return; }
      const [firstNode, lastNode] = [nodes[0], nodes[nodes.length - 1]];
      if (e.shiftKey && (document.activeElement === firstNode || document.activeElement === ref.current)) { e.preventDefault(); lastNode.focus(); }
      else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // Return focus to the control that opened the dialog, or to the page if it no longer exists
      if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
      else document.getElementById('main')?.focus();
    };
  }, []);

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref}>
        <div className="modal-header">
          <h2 id={titleId} className="heading-lg">{title}</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmation for consequential actions. `onConfirm` may be async; the dialog shows progress and stays open on failure. */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Keep it', danger = false, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <Modal title={title} onClose={busy ? () => {} : onCancel}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy} data-autofocus>{cancelLabel}</button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={run} disabled={busy}>
          {busy ? <Spinner /> : null} {confirmLabel}
        </button>
      </>}>
      <div className="body-md text-secondary">{message}</div>
    </Modal>
  );
}

// ─── Toasts ────────────────────────────────────────────────
const TOAST_ICON = { success: CircleCheck, danger: CircleAlert, info: Info };
export function Toaster() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toast-region" aria-live="polite" aria-relevant="additions">
      {toasts.map(t => {
        const Icon = TOAST_ICON[t.type] || Info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'danger' ? 'alert' : 'status'}>
            <Icon size={18} aria-hidden="true" />
            <div className="toast-body">{t.message}</div>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Photo credits (required by the CC BY / CC BY-SA licences) ─
export function PhotoCreditsDialog({ onClose }) {
  return (
    <Modal title="Photo credits" onClose={onClose} size="lg">
      <p className="body-sm text-secondary mb-md">
        Food photographs are from Wikimedia Commons, cropped and resized for MealSync. Each is used under the licence shown.
        Photos marked “representative” show a closely matching dish where no photo of the exact dish was available.
      </p>
      <ul className="credits-list">
        {photoCredits().map(c => (
          <li key={c.key}>
            <span className="label">
              {c.key === 'hero' ? 'Landing page — thali' : c.title.replace(/\.[a-z]+$/i, '')}
              {c.representative && <span className="badge badge-muted" style={{ marginLeft: 8 }}>Representative</span>}
            </span>
            <span className="text-muted">
              {c.author} · {c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}<span className="sr-only"> (opens in a new tab)</span></a> : c.license}
              {' · '}<a href={c.source} target="_blank" rel="noreferrer">Source<span className="sr-only"> for {c.title} (opens in a new tab)</span></a>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

// ─── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 16, label }) {
  return (
    <span className="spinner-inline" role={label ? 'status' : undefined}>
      <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
