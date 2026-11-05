import { useState, useMemo, Component } from 'react';
import {
  Trash2, Check, Info, AlertTriangle, ArrowLeft, ArrowRight, RefreshCw, SearchX, ShoppingBag, CircleAlert, QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { SectionHeader, SlotPicker, EmptyState, Spinner, MealImage, OrderTimeline, ConfirmDialog } from '../components/Shared';
import { MenuCard, MenuFilters, QuantityStepper, categoryCounts, counterFor } from '../components/MenuCatalog';
import { isOrderable } from '../lib/cart';
import { slotHasEnded } from '../lib/slots';

// ─── Error Boundary to prevent a blank page if rendering fails ───────────────
class CheckoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Checkout error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card narrow-card text-center">
          <AlertTriangle size={40} className="text-danger" aria-hidden="true" />
          <h2 className="heading-lg">Something went wrong</h2>
          <p className="body-sm text-muted">The checkout screen could not be displayed. Your cart is unchanged.</p>
          <button type="button" className="btn btn-primary"
            onClick={() => { this.setState({ hasError: false }); this.props.onReset?.(); }}>
            <RefreshCw size={16} aria-hidden="true" /> Back to menu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const STEPS = [
  { key: 'cart', label: 'Review order' },
  { key: 'slot', label: 'Pickup slot' },
  { key: 'payment', label: 'Payment' },
];

const SORTS = [
  { value: 'default', label: 'In stock first' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
];

// ─── Place Order ─────────────────────────────────────────────────────────────
export default function OrderPage({ setPage }) {
  const {
    liveMenu: menuItems, menuStatus, fetchMeals, slots, cart, addToCart, removeFromCart,
    clearCart, cartTotal, cartCount, cartHasUnavailable, placeOrder, fetchSlots, showToast,
  } = useApp();

  const [selectedSlot, setSelectedSlot] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [step, setStep] = useState('cart'); // cart | slot | payment | confirm
  const [placedOrder, setPlacedOrder] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [payMethod, setPayMethod] = useState('UPI');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter(item => {
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return Number(isOrderable(b)) - Number(isOrderable(a)) || a.name.localeCompare(b.name);
    });
  }, [menuItems, categoryFilter, searchQuery, sortBy]);

  // Open slots from the server; bookings and capacity are tracked and enforced by the backend
  const openSlots = useMemo(() => slots.filter(s => s.active), [slots]);
  const getCartQty = (id) => cart.find(c => c.menuItemId === id)?.qty || 0;
  const counts = useMemo(() => categoryCounts(menuItems), [menuItems]);
  const addItem = (item) => {
    if (getCartQty(item.id) === 0) showToast(`${item.name} added to your order.`);
    addToCart(item);
  };
  const menuItemFor = (line) => menuItems.find(m => m.id === line.menuItemId);

  // If the cart empties (e.g. items removed), go back to the review step
  const activeStep = cartCount === 0 && step !== 'confirm' ? 'cart' : step;

  const handlePlaceOrder = async () => {
    if (isSubmitting) return; // prevent double submit
    setIsSubmitting(true);
    setOrderError('');
    try {
      const idempotencyKey = 'ik_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const order = await placeOrder(selectedSlot, '', payMethod, simulateFailure, idempotencyKey);
      if (order && !order.error) {
        setPlacedOrder(order);
        setStep('confirm');
      } else {
        setOrderError(order?.error || 'Unable to complete the order. Please check stock and try again.');
        fetchSlots(); // a slot may have filled up meanwhile
        fetchMeals(); // and stock may have changed
      }
    } catch (err) {
      console.error('Error during checkout:', err);
      setOrderError('The order could not be sent because the server is unreachable. Nothing was charged — please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'confirm' && placedOrder) {
    return <OrderConfirmation order={placedOrder} onViewOrders={() => setPage('my-orders')}
      onOrderAgain={() => { setStep('cart'); setPlacedOrder(null); setOrderError(''); }} />;
  }

  return (
    <CheckoutErrorBoundary onReset={() => { setStep('cart'); setPlacedOrder(null); setOrderError(''); }}>
      <div className={cartCount > 0 ? 'has-cart-bar' : ''}>
      <SectionHeader title="Place order" subtitle="Choose dishes, pick a pickup slot and confirm. Prices and stock are checked again when you order." />

      <div className="order-layout">
        <section className="order-catalog" aria-label="Menu">
          <MenuFilters search={searchQuery} onSearch={setSearchQuery} category={categoryFilter} onCategory={setCategoryFilter} counts={counts}>
            <label className="sort-field">
              <span className="sr-only">Sort dishes</span>
              <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </MenuFilters>

          <div className="results-bar">
            <span className="body-sm text-secondary">{filteredItems.length} dish{filteredItems.length === 1 ? '' : 'es'}</span>
            <span className="live-indicator"><span className="status-dot online" aria-hidden="true" /> Stock from the kitchen</span>
          </div>

          {menuStatus === 'error' && menuItems.length === 0 ? (
            <div className="alert alert-danger" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              <span>The menu could not be loaded. Check your connection and try again.</span>
              <button type="button" className="btn btn-outline btn-sm" onClick={fetchMeals}>Retry</button>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="menu-grid" aria-busy="true" aria-label="Loading the menu">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" style={{ aspectRatio: '4 / 5' }} />)}
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState icon={SearchX} title="No dishes match" message="Try another keyword or category."
              action={<button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}>Clear filters</button>} />
          ) : (
            <div className="menu-grid">
              {filteredItems.map(item => (
                <MenuCard key={item.id} item={item} qty={getCartQty(item.id)}
                  onAdd={() => addItem(item)} onRemove={() => removeFromCart(item.id)} />
              ))}
            </div>
          )}
        </section>

        <aside className="order-summary" aria-label="Your order" id="order-summary">
          <ol className="stepper" aria-label="Checkout steps">
            {STEPS.map((s, idx) => {
              const current = STEPS.findIndex(x => x.key === activeStep);
              return (
                <li key={s.key} className={idx < current ? 'done' : idx === current ? 'current' : ''} aria-current={idx === current ? 'step' : undefined}>
                  <span><span className="stepper-index">{idx + 1}.</span>{s.label}{idx < current && <span className="sr-only"> (done)</span>}</span>
                </li>
              );
            })}
          </ol>

          {activeStep === 'cart' && (
            <CartPanel cart={cart} cartTotal={cartTotal} cartCount={cartCount} hasUnavailable={cartHasUnavailable}
              menuItemFor={menuItemFor} onAdd={addToCart} onRemove={removeFromCart} onClear={() => setConfirmClear(true)}
              onProceed={() => setStep('slot')} />
          )}

          {activeStep === 'slot' && (
            <SlotPanel slots={openSlots} selected={selectedSlot} onSelect={setSelectedSlot}
              onBack={() => setStep('cart')} onProceed={() => setStep('payment')} />
          )}

          {activeStep === 'payment' && (
            <PaymentPanel cart={cart} cartTotal={cartTotal} hasUnavailable={cartHasUnavailable}
              slot={slots.find(s => s.id === selectedSlot)}
              payMethod={payMethod} setPayMethod={setPayMethod}
              simulateFailure={simulateFailure} setSimulateFailure={setSimulateFailure}
              orderError={orderError} loading={isSubmitting}
              onBack={() => setStep('slot')} onConfirm={handlePlaceOrder}
              onChangeSlot={() => { setOrderError(''); setSelectedSlot(''); setStep('slot'); }} />
          )}
        </aside>
      </div>

      {cartCount > 0 && (
        <div className="cart-bar" role="region" aria-label="Order summary">
          <div className="cart-bar-summary">
            <ShoppingBag size={18} aria-hidden="true" />
            <span><strong>{cartCount}</strong> item{cartCount === 1 ? '' : 's'} · <strong>₹{cartTotal}</strong></span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => document.getElementById('order-summary')?.scrollIntoView({ behavior: 'smooth' })}>
            Continue
          </button>
        </div>
      )}

      {confirmClear && (
        <ConfirmDialog title="Clear your order?" message="All dishes will be removed from your order."
          confirmLabel="Clear order" cancelLabel="Keep dishes" danger
          onConfirm={() => { clearCart(); setConfirmClear(false); }} onCancel={() => setConfirmClear(false)} />
      )}
      </div>
    </CheckoutErrorBoundary>
  );
}

// ─── Cart Panel ─────────────────────────────────────────────────────────────
function CartPanel({ cart, cartTotal, cartCount, hasUnavailable, menuItemFor, onAdd, onRemove, onClear, onProceed }) {
  if (cart.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={ShoppingBag} title="Your order is empty" message="Add dishes from the menu to start an order." />
      </div>
    );
  }

  return (
    <div className="card summary-card">
      <div className="summary-header">
        <h2 className="heading-md">Your order <span className="text-muted">({cartCount})</span></h2>
        <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={onClear}>
          <Trash2 size={14} aria-hidden="true" /> Clear order
        </button>
      </div>

      <ul className="cart-lines">
        {cart.map(line => {
          const item = menuItemFor(line);
          return (
            <li key={line.menuItemId} className={`cart-line ${line.unavailable ? 'is-unavailable' : ''}`}>
              <MealImage item={{ name: line.name, imageUrl: line.imageUrl }} alt="" className="meal-thumb" showLabel={false} />
              <div className="cart-line-main">
              <div className="cart-line-info">
                <span className="cart-line-name">{line.name}</span>
                <span className="caption text-muted">₹{line.price} each</span>
                {line.unavailable && <span className="caption text-danger">No longer available — remove it to continue</span>}
              </div>
              <div className="cart-line-controls">
                {line.unavailable || !item ? (
                  <button type="button" className="btn btn-ghost btn-sm text-danger"
                    onClick={() => { for (let i = 0; i < line.qty; i++) onRemove(line.menuItemId); }}>Remove</button>
                ) : (
                  <QuantityStepper name={line.name} qty={line.qty} max={item.qty} onAdd={() => onAdd(item)} onRemove={() => onRemove(line.menuItemId)} />
                )}
                <span className="cart-line-total">₹{line.price * line.qty}</span>
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="summary-total">
        <span>Total</span>
        <span className="price">₹{cartTotal}</span>
      </div>
      <p className="caption text-muted">The kitchen confirms prices and stock when you place the order.</p>

      <button type="button" className="btn btn-primary btn-full" onClick={onProceed} disabled={hasUnavailable}>
        Choose pickup slot <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// ─── Slot Selection Panel ───────────────────────────────────────────────────
function SlotPanel({ slots, selected, onSelect, onBack, onProceed }) {
  const anyOpen = slots.some(s => s.booked < s.capacity && !slotHasEnded(s));
  return (
    <div className="card summary-card">
      <div className="summary-header">
        <h2 className="heading-md">Pickup slot</h2>
      </div>
      <p className="body-sm text-muted">Pick a 15-minute window today. Your place is reserved only when the order is confirmed.</p>

      {slots.length === 0 ? (
        <div className="loading-row" role="status"><Spinner /> Loading pickup slots…</div>
      ) : (
        <SlotPicker slots={slots} selected={selected} onSelect={onSelect} />
      )}
      {slots.length > 0 && !anyOpen && (
        <div className="alert alert-warning"><AlertTriangle size={16} aria-hidden="true" /><span>Every remaining slot today is full or has ended.</span></div>
      )}

      <div className="button-row">
        <button type="button" className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <button type="button" className="btn btn-primary" disabled={!selected} onClick={onProceed}>
          Continue to payment <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Payment Panel ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI', note: 'Simulated instant payment' },
  { id: 'Card', label: 'Debit / credit card', note: 'Simulated card authorization' },
  { id: 'Mess Wallet', label: 'Mess wallet', note: 'Simulated campus card deduction' },
  { id: 'Cash (at counter)', label: 'Cash at counter', note: 'Pay when you collect' },
];

function PaymentPanel({
  cart, cartTotal, hasUnavailable, slot, payMethod, setPayMethod,
  simulateFailure, setSimulateFailure, orderError, loading, onBack, onConfirm, onChangeSlot,
}) {
  const slotProblem = /slot/i.test(orderError || '');
  return (
    <div className="card summary-card">
      <div className="summary-header">
        <h2 className="heading-md">Review &amp; pay</h2>
      </div>

      <ul className="summary-lines">
        {cart.map(line => (
          <li key={line.menuItemId}><span>{line.name} × {line.qty}</span><span>₹{line.price * line.qty}</span></li>
        ))}
      </ul>
      <div className="summary-total"><span>Total</span><span className="price">₹{cartTotal}</span></div>
      {slot && (
        <p className="body-sm text-secondary flex justify-between items-center">
          <span>Pickup <strong className="text-primary">{slot.label}</strong></span>
          <button type="button" className="btn btn-link btn-sm" onClick={onChangeSlot} disabled={loading}>Change slot</button>
        </p>
      )}

      <div className="alert alert-info">
        <Info size={16} aria-hidden="true" />
        <span>Online payments use the <strong>test payment simulator</strong> — no real money is charged. Your order and stock are saved for real.</span>
      </div>

      <fieldset className="radio-list" disabled={loading}>
        <legend className="form-label">Payment method</legend>
        {PAYMENT_METHODS.map(m => (
          <label key={m.id} className={`radio-option ${payMethod === m.id ? 'selected' : ''}`}>
            <input type="radio" name="payMethod" value={m.id} checked={payMethod === m.id} onChange={() => setPayMethod(m.id)} />
            <span>
              <span className="label">{m.label}</span>
              <span className="caption text-muted">{m.note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <details>
        <summary className="caption text-muted">Testing options</summary>
        <label className="checkbox-option mt-sm">
          <input type="checkbox" checked={simulateFailure} onChange={e => setSimulateFailure(e.target.checked)} disabled={loading} />
          <span className="body-sm">Simulate a declined payment (checks that nothing is charged and stock is restored)</span>
        </label>
      </details>

      {orderError && (
        <div className="alert alert-danger" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            {orderError}
            {slotProblem && <> <button type="button" className="btn btn-link btn-sm" onClick={onChangeSlot}>Choose another slot</button></>}
          </span>
        </div>
      )}

      <div className="button-row">
        <button type="button" className="btn btn-ghost" onClick={onBack} disabled={loading}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={loading || hasUnavailable}>
          {loading ? <><Spinner /> Placing order…</> : <>Place order · ₹{cartTotal}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Confirmation & QR ticket ───────────────────────────────────────────────
function OrderConfirmation({ order, onViewOrders, onOrderAgain }) {
  const isCash = order.paymentStatus === 'PENDING_CASH';
  const counters = [...new Set((order.items || []).map(i => counterFor(i.category)))];
  return (
    <div className="narrow-page">
      <div className="card confirmation-card" role="status">
        <span className="confirm-mark" aria-hidden="true"><Check size={26} strokeWidth={2.5} /></span>
        <h1 className="display-md">Order confirmed</h1>
        <p className="body-md text-secondary">
          Your place in the <strong className="text-primary">{order.slotLabel}</strong> slot is reserved. Show this QR ticket at the {counters.join(' and ').toLowerCase()}.
        </p>

        <div className="qr-ticket">
          <QRCodeSVG value={order.qrCodeData || order.id} size={184} bgColor="#ffffff" fgColor="#20211D" level="H"
            title={`QR ticket for order ${order.id}`} />
          <div className="qr-ticket-id">{order.id}</div>
        </div>

        <dl className="detail-list">
          <div><dt>Order number</dt><dd className="mono">{order.id}</dd></div>
          <div><dt>Pickup slot</dt><dd>{order.slotLabel}</dd></div>
          <div><dt>Payment</dt><dd>{order.payMethod || 'UPI'} · {isCash ? 'pay in cash at pickup' : 'paid (test payment)'}</dd></div>
          {order.transactionId && <div><dt>Transaction</dt><dd className="mono">{order.transactionId}</dd></div>}
        </dl>

        <div style={{ textAlign: 'left' }}><OrderTimeline order={order} /></div>

        <ul className="summary-lines">
          {(order.items || []).map((item, idx) => (
            <li key={idx}><span>{item.name} × {item.qty}</span><span>₹{item.price * item.qty}</span></li>
          ))}
        </ul>
        <div className="summary-total"><span>{isCash ? 'Total due' : 'Total paid'}</span><span className="price">₹{order.total}</span></div>

        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={onViewOrders}><QrCode size={16} aria-hidden="true" /> Track in My orders</button>
          <button type="button" className="btn btn-outline" onClick={onOrderAgain}>Order something else</button>
        </div>
      </div>
    </div>
  );
}
