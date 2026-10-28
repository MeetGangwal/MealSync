import { useState, useMemo, Component } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, CheckCircle,
  Info, AlertTriangle, Search, ArrowLeft, ArrowRight,
  ShieldCheck, RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SectionHeader, SlotPicker } from '../components/Shared';
import { QRCodeSVG } from 'qrcode.react';

// ─── Error Boundary to prevent any blank page crash ──────────────────────────
class CheckoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || 'Rendering error' };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Checkout error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <AlertTriangle size={48} color="var(--color-danger)" style={{ margin: '0 auto var(--space-md)' }} />
          <h2 className="heading-lg mb-sm">Something went wrong</h2>
          <p className="body-sm text-muted mb-lg">
            An unexpected error occurred while displaying your checkout screen: {this.state.errorMsg}
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={() => {
              this.setState({ hasError: false });
              if (this.props.onReset) this.props.onReset();
            }}
          >
            <RefreshCw size={16} /> Return to Menu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main OrderPage Component ────────────────────────────────────────────────
export default function OrderPage({ setPage }) {
  const {
    menuItems, slots, cart, addToCart, removeFromCart,
    clearCart, cartTotal, cartCount, placeOrder,
  } = useApp();

  const [selectedSlot, setSelectedSlot] = useState(slots[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState('browse'); // browse | cart | slot | payment | confirm
  const [placedOrder, setPlacedOrder] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [payMethod, setPayMethod] = useState('UPI');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Unified Category Definitions
  const categories = [
    { key: 'all', label: 'All Items', icon: '🍽️' },
    { key: 'thali', label: 'Thalis & Combos', icon: '🍱' },
    { key: 'snacks', label: 'Snacks & Quick Bites', icon: '🍔' },
    { key: 'south-indian', label: 'South Indian & Breakfast', icon: '🥞' },
    { key: 'meals', label: 'Rice Bowls & Curries', icon: '🍛' },
    { key: 'beverages', label: 'Beverages', icon: '🥤' },
  ];

  // Filtering & Sorting Unified Catalogue
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchSearch = !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      // 'popular' or default
      return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
    });
  }, [menuItems, categoryFilter, searchQuery, sortBy]);

  const lunchSlots = useMemo(() => slots.filter(s => s.meal === 'lunch'), [slots]);

  // Root Cause Fix: Explicit async / await with error handling and loading protection
  const handlePlaceOrder = async () => {
    if (isSubmitting) return; // Prevent double submit
    setIsSubmitting(true);
    setOrderError('');

    try {
      const idempotencyKey = 'ik_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const order = await placeOrder(selectedSlot, notes, payMethod, simulateFailure, idempotencyKey);

      if (order && !order.error) {
        setPlacedOrder(order);
        setStep('confirm');
      } else {
        setOrderError(order?.error || 'Unable to complete order. Please check stock and try again.');
      }
    } catch (err) {
      console.error('Error during checkout:', err);
      setOrderError(err?.message || 'A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCartQty = (id) => cart.find(c => c.menuItemId === id)?.qty || 0;

  // ── Step: Confirm / QR Ticket ──────────────────────────────────────────────
  if (step === 'confirm' && placedOrder) {
    const isCash = placedOrder.payMethod?.toLowerCase().includes('cash');

    return (
      <div style={{ maxWidth: 540, margin: '0 auto', paddingBottom: 'var(--space-2xl)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-sm)' }}>🎉</div>
          <h1 className="display-md grad-text mb-xs">Order Confirmed!</h1>
          <div className="body-sm text-secondary mb-lg">
            Your food is being prepared at the mess counter. Present this QR code when collecting your meal.
          </div>

          {/* QR Code Ticket */}
          <div className="qr-container mb-lg" style={{ display: 'inline-block', padding: 18, background: '#ffffff', borderRadius: 16, border: '3px solid var(--brand-primary)', boxShadow: '0 8px 24px rgba(108,99,255,0.25)' }}>
            <QRCodeSVG
              value={placedOrder.qrCodeData || placedOrder.id || 'MEALSYNC-TICKET'}
              size={180}
              bgColor="#ffffff"
              fgColor="#111221"
              level="H"
            />
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#111221', fontWeight: 700, letterSpacing: '0.08em' }}>
              {placedOrder.id}
            </div>
          </div>

          {/* Order Details Card */}
          <div className="card-glass mb-lg" style={{ textAlign: 'left', padding: 'var(--space-lg)' }}>
            <div className="flex justify-between items-center mb-sm">
              <span className="label text-muted">Order ID</span>
              <span className="heading-sm text-brand">{placedOrder.id}</span>
            </div>
            <div className="flex justify-between items-center mb-sm">
              <span className="label text-muted">Pickup Slot</span>
              <span className="label" style={{ color: 'var(--brand-accent)' }}>📍 {placedOrder.slotLabel}</span>
            </div>
            <div className="flex justify-between items-center mb-sm">
              <span className="label text-muted">Payment Mode</span>
              <span className="label">
                {placedOrder.payMethod || 'UPI'} {isCash ? '(Pay at Counter)' : '(Simulated Paid)'}
              </span>
            </div>
            {placedOrder.transactionId && (
              <div className="flex justify-between items-center mb-sm">
                <span className="label text-muted">Transaction ID</span>
                <span className="label text-mono" style={{ fontSize: '0.78rem', color: 'var(--brand-primary)', fontWeight: 600 }}>{placedOrder.transactionId}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-sm">
              <span className="label text-muted">Payment Status</span>
              <span className={`badge ${placedOrder.paymentStatus === 'PENDING_CASH' ? 'badge-warning' : 'badge-success'}`}>
                {placedOrder.paymentStatus || 'PAID'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-sm">
              <span className="label text-muted">Order Status</span>
              <span className="badge badge-success">{placedOrder.status || 'CONFIRMED'}</span>
            </div>

            <div className="divider" style={{ margin: '12px 0' }} />

            {/* Itemized breakdown */}
            <div className="mb-sm">
              <div className="caption text-muted mb-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ordered Items</div>
              {(placedOrder.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center mb-xs body-sm">
                  <span>{item.emoji || '🍽️'} {item.name} ×{item.qty}</span>
                  <span className="label">₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>

            <div className="divider" style={{ margin: '12px 0' }} />

            <div className="flex justify-between items-center">
              <span className="heading-sm">Total Paid / Due</span>
              <span className="heading-lg text-success">₹{placedOrder.total}</span>
            </div>
          </div>

          {/* Safe Campus Instructions */}
          <div className="alert alert-info mb-lg" style={{ textAlign: 'left' }}>
            <Info size={18} style={{ flexShrink: 0 }} />
            <div className="caption">
              <strong>Mess Operations:</strong> Walk up to the food counter during your slot (<strong>{placedOrder.slotLabel}</strong>). Show your digital QR ticket for instant service without standing in billing queues.
            </div>
          </div>

          <div className="flex gap-sm">
            <button className="btn btn-ghost flex-1" onClick={() => setPage('my-orders')}>
              View My Orders
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={() => {
                setStep('browse');
                setPlacedOrder(null);
                setOrderError('');
              }}
            >
              Order Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CheckoutErrorBoundary onReset={() => { setStep('browse'); setPlacedOrder(null); setOrderError(''); }}>
      <div>
        <SectionHeader
          title="Campus Food Menu"
          subtitle="One unified food counter • Browse dishes & thalis, book your pickup slot, skip the line"
          actions={
            <button
              className="btn btn-primary"
              onClick={() => cartCount > 0 && setStep('cart')}
              disabled={cartCount === 0}
            >
              <ShoppingCart size={16} /> Cart ({cartCount}) — ₹{cartTotal}
            </button>
          }
        />

        <div className="order-page-layout">

          {/* ── Left Column: Unified Product Catalogue ──────────────────────── */}
          <div>
            {/* Search, Filter & Sort Bar */}
            <div className="flex gap-sm mb-md flex-wrap items-center">
              <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
                <Search size={16} className="search-icon" />
                <input
                  placeholder="Search 40+ canteen items (Vada Pav, Thali, Dosa...)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="form-input"
                style={{ width: 170, cursor: 'pointer' }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="popular">🔥 Most Popular</option>
                <option value="price-low">💰 Price: Low to High</option>
                <option value="price-high">💎 Price: High to Low</option>
                <option value="name">🔤 Name: A to Z</option>
              </select>
            </div>

            {/* Category Filter Pills */}
            <div className="tab-list mb-lg" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4 }}>
              {categories.map(cat => (
                <div
                  key={cat.key}
                  className={`tab-item ${categoryFilter === cat.key ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(cat.key)}
                >
                  <span style={{ marginRight: 6 }}>{cat.icon}</span>
                  {cat.label}
                </div>
              ))}
            </div>

            {/* Live Count and Availability Badge */}
            <div className="flex justify-between items-center mb-md">
              <div className="body-sm text-secondary">
                Showing <strong>{filteredItems.length}</strong> canteen items
              </div>
              <div className="flex items-center gap-xs">
                <div className="status-dot online pulse" />
                <span className="caption text-success">Live Kitchen Inventory</span>
              </div>
            </div>

            {/* Empty or Loaded Products Grid */}
            {filteredItems.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔍</div>
                <h3 className="heading-md mb-xs">No items match your search</h3>
                <p className="body-sm text-muted mb-md">Try searching for a different keyword or switch category filters.</p>
                <button className="btn btn-ghost" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-2 gap-md">
                {filteredItems.map(item => (
                  <UnifiedMenuItemCard
                    key={item.id}
                    item={item}
                    qty={getCartQty(item.id)}
                    onAdd={() => addToCart(item)}
                    onRemove={() => removeFromCart(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right Column: Interactive Checkout Panel ─────────────────────── */}
          <div className="order-sidebar-sticky">
            {/* Step 1: Cart Review */}
            {(step === 'browse' || step === 'cart') && (
              <CartPanel
                cart={cart}
                cartTotal={cartTotal}
                onRemove={removeFromCart}
                onClear={clearCart}
                onProceed={() => setStep('slot')}
              />
            )}

            {/* Step 2: Pickup Slot Selection */}
            {step === 'slot' && (
              <SlotPanel
                slots={lunchSlots}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
                notes={notes}
                onNotes={setNotes}
                onBack={() => setStep('cart')}
                onProceed={() => setStep('payment')}
              />
            )}

            {/* Step 3: Payment & Order Submission */}
            {step === 'payment' && (
              <PaymentPanel
                cart={cart}
                cartTotal={cartTotal}
                slot={slots.find(s => s.id === selectedSlot)}
                payMethod={payMethod}
                setPayMethod={setPayMethod}
                simulateFailure={simulateFailure}
                setSimulateFailure={setSimulateFailure}
                orderError={orderError}
                loading={isSubmitting}
                onBack={() => setStep('slot')}
                onConfirm={handlePlaceOrder}
              />
            )}
          </div>
        </div>
      </div>
    </CheckoutErrorBoundary>
  );
}

// ─── Unified Menu Item Card ──────────────────────────────────────────────────
function UnifiedMenuItemCard({ item, qty, onAdd, onRemove }) {
  const soldOut = !item.available || item.qty === 0;
  const lowStock = item.available && item.qty > 0 && item.qty < 25;

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'thali': return { label: '🍱 Thali Combo', className: 'badge-primary' };
      case 'snacks': return { label: '🍔 Snack', className: 'badge-warning' };
      case 'south-indian': return { label: '🥞 South Indian', className: 'badge-info' };
      case 'beverages': return { label: '🥤 Drink', className: 'badge-muted' };
      default: return { label: '🍛 Meal Bowl', className: 'badge-success' };
    }
  };

  const badge = getCategoryBadge(item.category);

  return (
    <div className={`menu-item-card ${soldOut ? 'sold-out' : ''}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div className="flex justify-between items-start mb-xs">
          <span style={{ fontSize: '2.4rem' }}>{item.emoji}</span>
          <div style={{ textAlign: 'right' }}>
            <div className="heading-lg text-brand" style={{ fontWeight: 800 }}>₹{item.price}</div>
            <span className={`badge ${badge.className}`} style={{ fontSize: '0.65rem' }}>{badge.label}</span>
          </div>
        </div>

        <div className="heading-sm mb-xs" style={{ marginTop: 4 }}>{item.name}</div>
        <div className="caption text-muted mb-sm" style={{ minHeight: 36, lineHeight: 1.4 }}>
          {item.description || 'Fresh campus meal freshly prepared today.'}
        </div>
      </div>

      <div>
        <div className="caption mb-sm" style={{ color: soldOut ? 'var(--color-danger)' : lowStock ? 'var(--color-warning)' : 'var(--text-muted)' }}>
          {soldOut ? '❌ Sold Out' : lowStock ? `⚠️ Only ${item.qty} left in stock!` : `🟢 ${item.qty} portions available`}
        </div>

        <div className="flex justify-between items-center">
          <span className="caption text-muted">⭐ {item.rating || '4.5'}</span>
          {soldOut ? (
            <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.6 }}>Sold Out</button>
          ) : qty === 0 ? (
            <button className="btn btn-primary btn-sm" onClick={onAdd}>
              <Plus size={14} /> Add to Cart
            </button>
          ) : (
            <div className="quantity-controls">
              <button className="qty-btn" onClick={onRemove}><Minus size={14} /></button>
              <span className="qty-value">{qty}</span>
              <button className="qty-btn" onClick={onAdd}><Plus size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cart Panel ─────────────────────────────────────────────────────────────
function CartPanel({ cart, cartTotal, onRemove, onClear, onProceed }) {
  if (cart.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🛒</div>
        <div className="heading-md mb-xs">Your Cart is Empty</div>
        <div className="body-sm text-muted">Add delicious food items from the menu to build your campus meal order.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-md">
        <h3 className="heading-lg">Your Order ({cart.reduce((s, i) => s + i.qty, 0)})</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClear} style={{ color: 'var(--color-danger)' }}>
          <Trash2 size={14} /> Clear
        </button>
      </div>

      {/* Unified Cart Items list */}
      <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 'var(--space-md)', paddingRight: 4 }}>
        {cart.map(item => (
          <div
            key={item.menuItemId}
            className="flex justify-between items-center"
            style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-sm">
              <span style={{ fontSize: '1.25rem' }}>{item.emoji || '🍽️'}</span>
              <div>
                <div className="label">{item.name}</div>
                <div className="caption text-muted">₹{item.price} × {item.qty}</div>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <span className="label text-brand">₹{item.price * item.qty}</span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => onRemove(item.menuItemId)}
                style={{ color: 'var(--color-danger)' }}
                title="Remove item"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="divider" style={{ margin: '12px 0' }} />

      <div className="flex justify-between items-center mb-md">
        <span className="heading-md">Estimated Total</span>
        <span className="heading-lg text-success">₹{cartTotal}</span>
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={onProceed}>
        Select Pickup Slot <ArrowRight size={16} />
      </button>
    </div>
  );
}

// ─── Slot Selection Panel ───────────────────────────────────────────────────
function SlotPanel({ slots, selected, onSelect, notes, onNotes, onBack, onProceed }) {
  return (
    <div className="card">
      <div className="flex items-center gap-sm mb-md">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onBack} title="Back">
          <ArrowLeft size={16} />
        </button>
        <h3 className="heading-lg">Choose Pickup Slot</h3>
      </div>

      <div className="caption text-muted mb-md">
        Select a 15-minute collection window to eliminate queue time at the mess.
      </div>

      <div className="mb-lg">
        <SlotPicker slots={slots} selected={selected} onSelect={onSelect} />
      </div>

      <div className="form-group mb-lg">
        <label className="form-label">Special Instructions (optional)</label>
        <textarea
          className="form-input form-textarea"
          style={{ minHeight: 65 }}
          placeholder="e.g. Less spicy, pack chutney separately..."
          value={notes}
          onChange={e => onNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-sm">
        <button className="btn btn-ghost flex-1" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-primary flex-1" disabled={!selected} onClick={onProceed}>
          Proceed to Pay →
        </button>
      </div>
    </div>
  );
}

// ─── Payment Panel (with honest simulation and robust submission) ───────────
function PaymentPanel({
  cart, cartTotal, slot, payMethod, setPayMethod,
  simulateFailure, setSimulateFailure,
  orderError, loading, onBack, onConfirm,
}) {
  const paymentMethods = [
    { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', note: 'Simulated Instant Demo Payment' },
    { id: 'Card', label: 'Debit / Credit Card', note: 'Simulated Card Authorization' },
    { id: 'Mess Wallet', label: 'Mess Wallet (Student RFID)', note: 'Campus Card Account (Demo)' },
    { id: 'Cash (at counter)', label: 'Pay Cash at Counter', note: 'Pay in cash upon food pickup' },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-sm mb-md">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onBack} title="Back" disabled={loading}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h3 className="heading-lg">Review & Payment</h3>
          <span className="caption text-muted">DEMO PAYMENT — No real money charged</span>
        </div>
      </div>

      {/* Order Summary Box */}
      <div className="card-glass mb-md" style={{ padding: 'var(--space-md)' }}>
        <div className="caption text-muted mb-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Order Summary</div>
        {cart.map(item => (
          <div key={item.menuItemId} className="flex justify-between mb-xs body-sm">
            <span>{item.emoji || '🍽️'} {item.name} ×{item.qty}</span>
            <span className="label">₹{item.price * item.qty}</span>
          </div>
        ))}

        <div className="divider" style={{ margin: '10px 0' }} />

        <div className="flex justify-between items-center">
          <span className="heading-sm">Total Amount</span>
          <span className="heading-lg text-success">₹{cartTotal}</span>
        </div>
        {slot && (
          <div className="caption text-brand" style={{ marginTop: 6, fontWeight: 600 }}>
            📍 Pickup Slot: {slot.label}
          </div>
        )}
      </div>

      {/* Honest Payment Demonstration Banner */}
      <div className="alert alert-info mb-md" style={{ padding: '10px 12px' }}>
        <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--brand-primary)' }} />
        <div className="caption" style={{ lineHeight: 1.4 }}>
          <strong>DEMO PAYMENT — No real money charged:</strong> No actual financial credentials or PINs are needed. Orders and stock are verified and saved in the real MySQL database.
        </div>
      </div>

      {/* Payment Methods Selection */}
      <div className="mb-md">
        <div className="form-label mb-xs">Select Payment Method</div>
        {paymentMethods.map(m => {
          const selected = payMethod === m.id;
          return (
            <div
              key={m.id}
              onClick={() => !loading && setPayMethod(m.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: selected ? 'rgba(108,99,255,0.12)' : 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${selected ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `2px solid ${selected ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)' }} />}
              </div>
              <div>
                <div className="label" style={{ fontSize: '0.82rem' }}>{m.label}</div>
                <div className="caption text-muted" style={{ fontSize: '0.7rem' }}>{m.note}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controlled Payment Failure Toggle (Test Mode) */}
      <div
        className="card-glass mb-md"
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: loading ? 'not-allowed' : 'pointer',
          border: simulateFailure ? '1px solid var(--color-danger)' : '1px solid var(--border-subtle)'
        }}
        onClick={() => !loading && setSimulateFailure(prev => !prev)}
      >
        <input
          type="checkbox"
          id="simulateFailureCheckbox"
          checked={simulateFailure}
          onChange={e => setSimulateFailure(e.target.checked)}
          disabled={loading}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-danger)' }}
        />
        <label htmlFor="simulateFailureCheckbox" style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.78rem', color: simulateFailure ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
          <strong>Simulate Payment Failure</strong> (Test Mode: verifies rollback & prevents stock loss)
        </label>
      </div>

      {/* Error Message Alert */}
      {orderError && (
        <div className="alert alert-danger mb-md">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{orderError}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-sm">
        <button className="btn btn-ghost flex-1" onClick={onBack} disabled={loading}>
          ← Back
        </button>
        <button
          className="btn btn-success flex-1"
          onClick={onConfirm}
          disabled={loading}
          style={{ fontWeight: 700 }}
        >
          {loading ? (
            <span className="flex items-center gap-sm justify-center">
              <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#0A0B14', borderRadius: '50%' }} />
              Placing Order…
            </span>
          ) : (
            <span className="flex items-center gap-sm justify-center">
              <CheckCircle size={16} /> Place Order (₹{cartTotal})
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
