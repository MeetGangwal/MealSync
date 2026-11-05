import { useState, useMemo, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import {
  SectionHeader, ProgressBar, Modal, Spinner, EmptyState, MealImage, StatusBadge, ConfirmDialog,
} from '../components/Shared';
import { isOrderable } from '../lib/cart';
import { formatDateTime } from '../lib/format';
import {
  MenuCard, MenuFilters, QuantityStepper, categoryLabel, categoryCounts, counterFor, stockText,
} from '../components/MenuCatalog';
import {
  Pause, Play, SkipForward, Pencil, X, AlertTriangle, RefreshCw, Plus, ShoppingBag, Info,
  SearchX, CalendarX, Ticket, CircleAlert, ArrowRight, ClipboardList,
} from 'lucide-react';

// ─── Today's menu ──────────────────────────────────────────
export function LiveMenuPage({ setPage }) {
  const { liveMenu: menuItems, menuStatus, fetchMeals, cart, addToCart, removeFromCart, cartCount, cartTotal, showToast } = useApp();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter(item => {
      const matchCat = category === 'all' || item.category === category;
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    }).sort((a, b) => Number(isOrderable(b)) - Number(isOrderable(a)));
  }, [menuItems, category, search]);

  const counts = useMemo(() => categoryCounts(menuItems), [menuItems]);
  const qtyInCart = (id) => cart.find(c => c.menuItemId === id)?.qty || 0;

  const add = (item) => {
    const before = qtyInCart(item.id);
    if (before >= item.qty) { showToast(`No more ${item.name} in stock.`, 'info'); return; }
    addToCart(item);
    if (before === 0) showToast(`${item.name} added to your order.`);
  };
  const remove = (item) => removeFromCart(item.id);

  // Keep the dialog in sync with live stock
  const liveDetail = detailItem ? menuItems.find(m => m.id === detailItem.id) || detailItem : null;

  return (
    <div className={cartCount > 0 ? 'has-cart-bar' : ''}>
      <SectionHeader
        title="Today’s menu"
        subtitle="Prices and remaining portions come straight from the kitchen. Add dishes, then choose a pickup slot."
        actions={cartCount > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => setPage('order')}>
            <ShoppingBag size={16} aria-hidden="true" /> Review order · ₹{cartTotal}
          </button>
        )}
      />

      <MenuFilters search={search} onSearch={setSearch} category={category} onCategory={setCategory} counts={counts} />

      {menuStatus === 'error' && menuItems.length === 0 ? (
        <div className="alert alert-danger" role="alert">
          <CircleAlert size={16} aria-hidden="true" />
          <span>The menu could not be loaded. Check your connection and try again.</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={fetchMeals}>Retry</button>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="menu-grid" aria-busy="true" aria-label="Loading the menu">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4 / 5' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchX} title="No dishes match" message="Try another keyword or category."
          action={<button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setCategory('all'); }}>Clear filters</button>} />
      ) : (
        <div className="menu-grid">
          {filtered.map(item => (
            <MenuCard key={item.id} item={item} qty={qtyInCart(item.id)}
              onAdd={() => add(item)} onRemove={() => remove(item)} onDetails={() => setDetailItem(item)} />
          ))}
        </div>
      )}

      {cartCount > 0 && (
        <div className="cart-bar" role="region" aria-label="Your order">
          <div className="cart-bar-summary">
            <ShoppingBag size={18} aria-hidden="true" />
            <span><strong>{cartCount}</strong> item{cartCount === 1 ? '' : 's'} · <strong>₹{cartTotal}</strong></span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setPage('order')}>Review order</button>
        </div>
      )}

      {liveDetail && (
        <Modal title={liveDetail.name} onClose={() => setDetailItem(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setDetailItem(null)}>Close</button>
              {isOrderable(liveDetail) && qtyInCart(liveDetail.id) === 0 && (
                <button type="button" className="btn btn-primary" onClick={() => add(liveDetail)}><Plus size={16} aria-hidden="true" /> Add to order</button>
              )}
              {qtyInCart(liveDetail.id) > 0 && (
                <button type="button" className="btn btn-primary" onClick={() => { setDetailItem(null); setPage('order'); }}>Review order</button>
              )}
            </>
          }>
          <div className="item-detail">
            <MealImage item={liveDetail} alt={liveDetail.name} />
            {liveDetail.description && <p className="body-md text-secondary">{liveDetail.description}</p>}
            <dl className="detail-list">
              <div><dt>Price</dt><dd>₹{liveDetail.price}</dd></div>
              <div><dt>Category</dt><dd>{categoryLabel(liveDetail.category)}</dd></div>
              <div><dt>Collect at</dt><dd>{counterFor(liveDetail.category)}</dd></div>
              <div><dt>Availability</dt><dd className={isOrderable(liveDetail) ? '' : 'text-danger'}>{stockText(liveDetail)}</dd></div>
            </dl>
            {qtyInCart(liveDetail.id) > 0 && (
              <div className="flex items-center justify-between gap-md">
                <span className="body-sm text-secondary">In your order</span>
                <QuantityStepper name={liveDetail.name} qty={qtyInCart(liveDetail.id)} max={liveDetail.qty} onAdd={() => add(liveDetail)} onRemove={() => remove(liveDetail)} />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Meal plans (subscriptions) ────────────────────────────
const PAYMENT_METHODS = [
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Debit / credit card' },
  { value: 'MESS_WALLET', label: 'Mess wallet' },
];

const STATUS_BADGE = { ACTIVE: ['badge-success', 'Active'], PAUSED: ['badge-warning', 'Paused'], EXPIRED: ['badge-muted', 'Expired'] };

function formatDate(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SubscriptionPage() {
  const { subscriptionPlans, subscriptions, fetchSubscriptions, subscribeToPlan, changeSubscription, showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(null); // `${id}:${action}` or `subscribe`
  const [error, setError] = useState('');
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [payMethod, setPayMethod] = useState('UPI');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      await fetchSubscriptions();
    } catch (e) {
      setLoadError(e.message || 'Meal plans could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [fetchSubscriptions]);

  useEffect(() => { load(); }, [load]);

  const live = subscriptions.filter(s => s.status === 'ACTIVE' || s.status === 'PAUSED');
  const past = subscriptions.filter(s => s.status === 'EXPIRED');
  const livePlanCodes = new Set(live.map(s => s.planCode));

  const act = async (sub, action, label) => {
    setBusy(`${sub.id}:${action}`);
    setError('');
    const res = await changeSubscription(sub.id, action);
    setBusy(null);
    if (res.error) setError(res.error);
    else showToast(`${sub.planName}: ${label}.`);
  };

  const confirmSubscribe = async () => {
    setBusy('subscribe');
    setError('');
    const res = await subscribeToPlan(confirmPlan.code, payMethod);
    setBusy(null);
    if (res.error) {
      setError(res.error);
    } else {
      showToast(`Subscribed to ${confirmPlan.name}. Test payment ${res.subscription.transactionId || ''} recorded.`);
    }
    setConfirmPlan(null);
  };

  return (
    <div>
      <SectionHeader title="Meal plans" subtitle="Monthly plans for regular meals. Pause, resume or skip a day — changes are saved to your account." />

      <div className="alert alert-info mb-lg">
        <Info size={16} aria-hidden="true" />
        <span>Plan payments use the MealSync <strong>test payment simulator</strong>. No real money is charged and no payment gateway is connected.</span>
      </div>

      {error && <div className="alert alert-danger mb-lg" role="alert"><CircleAlert size={16} aria-hidden="true" /><span>{error}</span></div>}

      {loading ? (
        <div className="card"><div className="loading-row" role="status"><Spinner /> Loading meal plans…</div></div>
      ) : loadError ? (
        <div className="alert alert-danger" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{loadError}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={load}>Retry</button>
        </div>
      ) : (
        <>
          <section className="section" aria-labelledby="my-plans">
            <div className="section-head"><h2 id="my-plans" className="heading-lg">Your plans</h2></div>
            {live.length === 0 ? (
              <EmptyState icon={CalendarX} title="No active meal plan" message="Choose a plan below. You can pause it or skip a day whenever you need to." />
            ) : (
              <div className="card-grid">
                {live.map(sub => <SubscriptionCard key={sub.id} sub={sub} busy={busy} onAction={act} />)}
              </div>
            )}
          </section>

          <section className="section" aria-labelledby="plans">
            <div className="section-head"><h2 id="plans" className="heading-lg">Available plans</h2></div>
            {subscriptionPlans.length === 0 ? (
              <p className="body-sm text-muted">No plans are offered at the moment.</p>
            ) : (
              <div className="card-grid">
                {subscriptionPlans.map(plan => {
                  const subscribed = livePlanCodes.has(plan.code);
                  return (
                    <article key={plan.code} className="card plan-card">
                      <div className="flex flex-col gap-xs">
                        <h3 className="heading-lg">{plan.name}</h3>
                        <p className="body-sm text-muted">{plan.description}</p>
                      </div>
                      <dl className="detail-list compact">
                        <div><dt>Meals</dt><dd>{plan.meals}</dd></div>
                        <div><dt>Days</dt><dd>{describeDays(plan.servingDays)}</dd></div>
                        <div><dt>Per month</dt><dd>{plan.mealsPerPeriod} meals</dd></div>
                      </dl>
                      <div className="plan-card-footer">
                        <span className="price heading-lg">₹{plan.monthlyPrice}<span className="caption text-muted"> / month</span></span>
                        {subscribed
                          ? <span className="badge badge-success">Subscribed</span>
                          : <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null}
                              onClick={() => { setPayMethod('UPI'); setConfirmPlan(plan); }}>Subscribe</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <details className="card">
              <summary className="heading-sm">Past plans ({past.length})</summary>
              <ul className="plain-list mt-md">
                {past.map(s => (
                  <li key={s.id} className="body-sm text-secondary">{s.planName} · {formatDate(s.startDate)} – {formatDate(s.endDate)} · {s.mealsSkipped} skipped</li>
                ))}
              </ul>
            </details>
          )}

          <p className="caption text-muted mt-lg">
            Meals used are not counted yet: plan meals are not linked to counter pickup, so only skipped meals reduce the remaining count.
          </p>
        </>
      )}

      {confirmPlan && (
        <Modal title={`Subscribe to ${confirmPlan.name}`} onClose={() => busy !== 'subscribe' && setConfirmPlan(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmPlan(null)} disabled={busy === 'subscribe'}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={confirmSubscribe} disabled={busy === 'subscribe'}>
                {busy === 'subscribe' ? <><Spinner /> Processing…</> : `Pay ₹${confirmPlan.monthlyPrice} (test payment)`}
              </button>
            </>
          }>
          <p className="body-md mb-md">
            {confirmPlan.meals}, {describeDays(confirmPlan.servingDays)} · {confirmPlan.mealsPerPeriod} meals for one month starting today.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="sub-pay">Payment method</label>
            <select id="sub-pay" className="form-select" value={payMethod} onChange={e => setPayMethod(e.target.value)} data-autofocus>
              {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="form-hint">No real payment is taken. The simulator records a test transaction ID.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function describeDays(servingDays) {
  const names = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [from, to] = String(servingDays || '').split('-').map(Number);
  if (!from) return servingDays;
  return from === (to || from) ? names[from] : `${names[from]}–${names[to]}`;
}

function SubscriptionCard({ sub, busy, onAction }) {
  const isBusy = (action) => busy === `${sub.id}:${action}`;
  const anyBusy = busy !== null;
  const [cls, label] = STATUS_BADGE[sub.status] || ['badge-muted', sub.status];
  return (
    <article className="card subscription-card">
      <div className="flex justify-between items-start gap-md">
        <div>
          <h3 className="heading-lg">{sub.planName}</h3>
          <p className="body-sm text-muted">{sub.meals} · {describeDays(sub.servingDays)}</p>
        </div>
        <span className={`badge badge-dot ${cls}`}>{label}</span>
      </div>

      <dl className="stat-row">
        <div><dt>Remaining</dt><dd>{sub.mealsRemaining}</dd></div>
        <div><dt>Skipped</dt><dd>{sub.mealsSkipped}</dd></div>
        <div><dt>Used</dt><dd>{sub.mealsUsed}</dd></div>
      </dl>
      <ProgressBar value={sub.mealsPerPeriod - sub.mealsRemaining} max={sub.mealsPerPeriod} label="Plan usage" showValue />

      <p className="caption text-muted">
        {formatDate(sub.startDate)} – {formatDate(sub.endDate)} · ₹{sub.amountCharged}{sub.paymentSimulated ? ' test payment' : ''}{sub.transactionId ? ` · ${sub.transactionId}` : ''}
      </p>

      <div className="card-actions">
        {sub.canPause && (
          <button type="button" className="btn btn-outline btn-sm" disabled={anyBusy} onClick={() => onAction(sub, 'pause', 'paused')}>
            {isBusy('pause') ? <Spinner /> : <Pause size={14} aria-hidden="true" />} Pause plan
          </button>
        )}
        {sub.canResume && (
          <button type="button" className="btn btn-primary btn-sm" disabled={anyBusy} onClick={() => onAction(sub, 'resume', 'resumed')}>
            {isBusy('resume') ? <Spinner /> : <Play size={14} aria-hidden="true" />} Resume plan
          </button>
        )}
        <button type="button" className="btn btn-outline btn-sm" disabled={anyBusy || !sub.canSkipToday}
          aria-describedby={!sub.canSkipToday && sub.skipBlockedReason ? `skip-why-${sub.id}` : undefined}
          onClick={() => onAction(sub, 'skip-today', 'today’s meal skipped')}>
          {isBusy('skip-today') ? <Spinner /> : <SkipForward size={14} aria-hidden="true" />} Skip today
        </button>
      </div>
      {!sub.canSkipToday && sub.skipBlockedReason && <p id={`skip-why-${sub.id}`} className="caption text-muted">{sub.skipBlockedReason}.</p>}
    </article>
  );
}

// ─── QR tickets ────────────────────────────────────────────
export function QRTicketsPage({ setPage }) {
  const { activeOrders } = useApp();

  return (
    <div>
      <SectionHeader title="QR tickets" subtitle="Show a ticket at the counter during your pickup slot. Tickets disappear once an order is collected or cancelled." />
      {activeOrders.length === 0 ? (
        <EmptyState icon={Ticket} title="No active tickets" message="Every order you place gets a QR ticket here."
          action={<button type="button" className="btn btn-primary btn-sm" onClick={() => setPage('order')}>Place an order</button>} />
      ) : (
        <div className="card-grid">
          {activeOrders.map(order => {
            const counters = [...new Set(order.items.map(i => counterFor(i.category)))];
            return (
              <article key={order.id} className="card flex flex-col items-center gap-md text-center">
                <div className="flex justify-between items-center w-full">
                  <span className="heading-lg">{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="qr-ticket">
                  <QRCodeSVG value={order.qrCodeData || order.id} size={176} bgColor="#ffffff" fgColor="#20211D" level="H"
                    title={`QR ticket for order ${order.id}`} />
                  <div className="qr-ticket-id">{order.id}</div>
                </div>
                <dl className="detail-list w-full" style={{ textAlign: 'left' }}>
                  <div><dt>Pickup slot</dt><dd>{order.slotLabel}</dd></div>
                  <div><dt>Collect at</dt><dd>{counters.join(' and ')}</dd></div>
                  <div><dt>Items</dt><dd>{order.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</dd></div>
                  <div><dt>{order.paymentStatus === 'PENDING_CASH' ? 'Pay at pickup' : 'Paid'}</dt><dd>₹{order.total}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Profile ───────────────────────────────────────────────
export function ProfilePage({ setPage }) {
  const { currentUser, myOrders, updateProfile, showToast } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [uid, setUid] = useState(currentUser?.uid || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [nameError, setNameError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = isEditing && (name !== (currentUser?.name || '') || phone !== (currentUser?.phone || '') || uid !== (currentUser?.uid || ''));

  const startEdit = () => {
    setName(currentUser?.name || '');
    setPhone(currentUser?.phone || '');
    setUid(currentUser?.uid || '');
    setErrorMsg('');
    setNameError('');
    setIsEditing(true);
  };

  const cancelEdit = () => { setIsEditing(false); setErrorMsg(''); setNameError(''); setConfirmDiscard(false); };

  const save = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setNameError('Enter your full name (at least 2 characters).');
      return;
    }
    setNameError('');
    setIsSaving(true);
    setErrorMsg('');
    const res = await updateProfile({ name: name.trim(), phone: phone.trim(), uid: uid.trim() });
    setIsSaving(false);
    if (res.success) {
      showToast('Profile saved.');
      setIsEditing(false);
    } else {
      setErrorMsg(res.error || 'The profile could not be saved. Please try again.');
    }
  };

  const spent = myOrders.reduce((s, o) => {
    const st = String(o.status || '').toUpperCase();
    return st !== 'CANCELLED' ? s + (o.total || 0) : s;
  }, 0);
  const lastOrder = myOrders[0];

  return (
    <div>
      <SectionHeader
        title="Profile"
        subtitle="Your account details. Your email is your sign-in and cannot be changed here."
        actions={!isEditing && <button type="button" className="btn btn-outline" onClick={startEdit}><Pencil size={15} aria-hidden="true" /> Edit profile</button>}
      />

      <div className="grid grid-2 gap-lg">
        <section className="card" aria-labelledby="account-title">
          <h2 id="account-title" className="sr-only">Account details</h2>
          {errorMsg && <div className="alert alert-danger mb-md" role="alert"><CircleAlert size={16} aria-hidden="true" /><span>{errorMsg}</span></div>}

          {!isEditing ? (
            <dl className="detail-list">
              <div><dt>Full name</dt><dd>{currentUser?.name}</dd></div>
              <div><dt>Email</dt><dd>{currentUser?.email}</dd></div>
              <div><dt>Campus ID</dt><dd>{currentUser?.uid || <span className="text-muted">Not set</span>}</dd></div>
              <div><dt>Phone</dt><dd>{currentUser?.phone || <span className="text-muted">Not set</span>}</dd></div>
              <div><dt>Account type</dt><dd>{currentUser?.isAdmin ? 'Mess administrator' : 'Student'}</dd></div>
            </dl>
          ) : (
            <form onSubmit={save} className="form-stack" noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="pf-name">Full name</label>
                <input id="pf-name" className="form-input" value={name} onChange={e => setName(e.target.value)} autoComplete="name"
                  aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'pf-name-error' : undefined} maxLength={100} />
                {nameError && <span id="pf-name-error" className="form-error"><CircleAlert size={14} aria-hidden="true" />{nameError}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pf-uid">Campus ID <span className="text-muted">(optional)</span></label>
                <input id="pf-uid" className="form-input" value={uid} onChange={e => setUid(e.target.value)} placeholder="e.g. 2025510014" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pf-email">Email</label>
                <input id="pf-email" className="form-input" value={currentUser?.email || ''} disabled aria-describedby="pf-email-hint" />
                <span id="pf-email-hint" className="form-hint">Your email is your sign-in, so it can’t be changed.</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pf-phone">Phone <span className="text-muted">(optional)</span></label>
                <input id="pf-phone" className="form-input" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="button-row">
                <button type="button" className="btn btn-ghost" onClick={() => (dirty ? setConfirmDiscard(true) : cancelEdit())} disabled={isSaving}>
                  <X size={15} aria-hidden="true" /> Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving || !dirty}>
                  {isSaving ? <><RefreshCw size={15} className="animate-spin" aria-hidden="true" /> Saving…</> : 'Save changes'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="card flex flex-col gap-md" aria-labelledby="activity-title">
          <h2 id="activity-title" className="heading-lg">Your activity</h2>
          <dl className="stat-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div><dt>Orders placed</dt><dd>{myOrders.length}</dd></div>
            <div><dt>Spent (excl. cancelled)</dt><dd>₹{spent}</dd></div>
          </dl>
          {lastOrder ? (
            <div className="row-item">
              <div className="row-item-main">
                <span className="label">Last order {lastOrder.id}</span>
                <span className="caption text-muted">{formatDateTime(lastOrder.createdAt)} · ₹{lastOrder.total}</span>
              </div>
              <StatusBadge status={lastOrder.status} />
            </div>
          ) : (
            <p className="body-sm text-muted">You haven’t placed an order yet.</p>
          )}
          <div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage('my-orders')}>
              <ClipboardList size={15} aria-hidden="true" /> View order history <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>

      {confirmDiscard && (
        <ConfirmDialog title="Discard your changes?" message="The edits you made to your profile will be lost."
          confirmLabel="Discard changes" cancelLabel="Keep editing" danger onConfirm={cancelEdit} onCancel={() => setConfirmDiscard(false)} />
      )}
    </div>
  );
}
