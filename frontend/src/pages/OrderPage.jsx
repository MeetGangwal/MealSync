import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, CreditCard, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ITEM_CATEGORY } from '../data/mockData';
import { SectionHeader, SlotPicker, AlertBanner } from '../components/Shared';
import { QRCodeSVG } from 'qrcode.react';

export default function OrderPage({ setPage }) {
  const { menuItems, slots, cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount, placeOrder, availableSlots } = useApp();
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState('browse'); // browse | cart | slot | payment | confirm
  const [placedOrder, setPlacedOrder] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [payMethod, setPayMethod] = useState('UPI');

  const thaliItems = menuItems.filter(i => i.category === ITEM_CATEGORY.THALI);
  const dishItems = menuItems.filter(i => i.category === ITEM_CATEGORY.DISHES);
  const filteredItems = categoryFilter === 'thali' ? thaliItems : categoryFilter === 'dishes' ? dishItems : menuItems;

  const cartByCounter = {
    thali: cart.filter(c => c.counter === 'thali'),
    dishes: cart.filter(c => c.counter === 'dishes'),
  };

  const lunchSlots = slots.filter(s => s.meal === 'lunch');

  const handlePlaceOrder = () => {
    const order = placeOrder(selectedSlot, notes);
    if (order) {
      setPlacedOrder(order);
      setStep('confirm');
    }
  };

  const getCartQty = (id) => cart.find(c => c.menuItemId === id)?.qty || 0;

  // ── Step: Confirm / QR ────────────────────────────────────
  if (step === 'confirm' && placedOrder) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>🎉</div>
          <h1 className="display-md grad-text mb-sm">Order Confirmed!</h1>
          <div className="body-sm text-secondary mb-xl">Your order has been placed. Go to the mess and scan your QR code.</div>

          {/* QR Code */}
          <div className="qr-container mb-lg" style={{ display: 'inline-block', padding: 20, background: '#fff', borderRadius: 16 }}>
            <QRCodeSVG
              value={JSON.stringify({ orderId: placedOrder.id, userId: placedOrder.userId, slot: placedOrder.slotLabel })}
              size={180}
              bgColor="#ffffff"
              fgColor="#111221"
              level="H"
            />
          </div>

          <div className="card-glass" style={{ marginBottom: 'var(--space-lg)', textAlign: 'left' }}>
            <div className="flex justify-between mb-sm">
              <span className="label text-muted">Order ID</span>
              <span className="heading-sm text-brand">{placedOrder.id}</span>
            </div>
            <div className="flex justify-between mb-sm">
              <span className="label text-muted">Pickup Slot</span>
              <span className="label">{placedOrder.slotLabel}</span>
            </div>
            {cartByCounter.thali.length > 0 && (
              <div className="flex justify-between mb-sm">
                <span className="label text-muted">🍱 Thali Counter</span>
                <span className="label text-secondary">{placedOrder.items.filter(i => i.counter === 'thali').map(i => i.name).join(', ')}</span>
              </div>
            )}
            {cartByCounter.dishes.length > 0 && (
              <div className="flex justify-between mb-sm">
                <span className="label text-muted">🍴 Dishes Counter</span>
                <span className="label text-secondary">{placedOrder.items.filter(i => i.counter === 'dishes').map(i => i.name).join(', ')}</span>
              </div>
            )}
            <div className="divider" />
            <div className="flex justify-between">
              <span className="heading-sm">Total Paid</span>
              <span className="heading-sm text-success">₹{placedOrder.total}</span>
            </div>
          </div>

          <div className="alert alert-info mb-lg">
            <Info size={16} />
            <span>Show this QR code at the respective counter(s) to collect your food.</span>
          </div>

          <div className="flex gap-sm">
            <button className="btn btn-ghost flex-1" onClick={() => setPage('my-orders')}>My Orders</button>
            <button className="btn btn-primary flex-1" onClick={() => { setStep('browse'); setPlacedOrder(null); }}>Order Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Place Order"
        subtitle="Browse the menu, add to cart, and get your QR ticket"
        actions={
          <button className="btn btn-primary" onClick={() => cartCount > 0 && setStep('cart')} disabled={cartCount === 0}>
            <ShoppingCart size={16} /> Cart ({cartCount}) — ₹{cartTotal}
          </button>
        }
      />

      <div className="grid gap-lg" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start' }}>

        {/* ── Left: Menu ─────────────────────────────────── */}
        <div>
          {/* Category Tabs */}
          <div className="tab-list mb-lg">
            <div className={`tab-item ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>All Items</div>
            <div className={`tab-item ${categoryFilter === 'thali' ? 'active' : ''}`} onClick={() => setCategoryFilter('thali')}>🍱 Thali Counter</div>
            <div className={`tab-item ${categoryFilter === 'dishes' ? 'active' : ''}`} onClick={() => setCategoryFilter('dishes')}>🍴 Dishes Counter</div>
          </div>

          {categoryFilter !== 'dishes' && (
            <div className="mb-xl">
              <div className="flex items-center gap-sm mb-md">
                <div className="stat-icon primary"><span>🍱</span></div>
                <h2 className="heading-lg">Thali Counter</h2>
                <span className="badge badge-primary">Counter 1</span>
              </div>
              <div className="grid grid-2 gap-md">
                {thaliItems.map(item => <MenuItemCard key={item.id} item={item} qty={getCartQty(item.id)} onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item.id)} />)}
              </div>
            </div>
          )}

          {categoryFilter !== 'thali' && (
            <div>
              <div className="flex items-center gap-sm mb-md">
                <div className="stat-icon info"><span>🍴</span></div>
                <h2 className="heading-lg">Other Dishes Counter</h2>
                <span className="badge badge-info">Counter 2</span>
              </div>
              <div className="grid grid-2 gap-md">
                {dishItems.map(item => <MenuItemCard key={item.id} item={item} qty={getCartQty(item.id)} onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item.id)} />)}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Cart / Steps ─────────────────────────── */}
        <div style={{ position: 'sticky', top: 'calc(var(--topbar-height) + 24px)' }}>
          {step === 'browse' && (
            <CartPanel
              cart={cart}
              cartTotal={cartTotal}
              cartByCounter={cartByCounter}
              onRemove={removeFromCart}
              onClear={clearCart}
              onProceed={() => setStep('slot')}
            />
          )}

          {step === 'slot' && (
            <SlotPanel
              slots={lunchSlots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              notes={notes}
              onNotes={setNotes}
              onBack={() => setStep('browse')}
              onProceed={() => setStep('payment')}
            />
          )}

          {step === 'payment' && (
            <PaymentPanel
              cart={cart}
              cartTotal={cartTotal}
              slot={slots.find(s => s.id === selectedSlot)}
              payMethod={payMethod}
              setPayMethod={setPayMethod}
              onBack={() => setStep('slot')}
              onConfirm={handlePlaceOrder}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Menu Item Card ─────────────────────────────────────────
function MenuItemCard({ item, qty, onAdd, onRemove }) {
  const soldOut = !item.available || item.qty === 0;
  const lowStock = item.available && item.qty > 0 && item.qty < 30;

  return (
    <div className={`menu-item-card ${soldOut ? 'sold-out' : ''}`}>
      <div className="flex justify-between items-start mb-sm">
        <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
        <div style={{ textAlign: 'right' }}>
          <div className="heading-md text-brand">₹{item.price}</div>
          {item.popular && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>🔥 Popular</span>}
        </div>
      </div>
      <div className="heading-sm mb-xs">{item.name}</div>
      <div className="caption text-muted mb-sm">{item.description}</div>
      <div className="caption" style={{ color: lowStock ? 'var(--color-warning)' : 'var(--text-muted)', marginBottom: 8 }}>
        {soldOut ? '❌ Sold Out' : lowStock ? `⚠️ Only ${item.qty} left!` : `${item.qty} available`}
      </div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-xs">
          <span className="caption text-muted">⭐ {item.rating}</span>
        </div>
        {soldOut ? (
          <button className="btn btn-ghost btn-sm" disabled>Unavailable</button>
        ) : qty === 0 ? (
          <button className="btn btn-primary btn-sm" onClick={onAdd}><Plus size={14} /> Add</button>
        ) : (
          <div className="quantity-controls">
            <button className="qty-btn" onClick={onRemove}><Minus size={14} /></button>
            <span className="qty-value">{qty}</span>
            <button className="qty-btn" onClick={onAdd}><Plus size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cart Panel ─────────────────────────────────────────────
function CartPanel({ cart, cartTotal, cartByCounter, onRemove, onClear, onProceed }) {
  if (cart.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🛒</div>
        <div className="heading-md mb-sm">Cart is empty</div>
        <div className="body-sm text-muted">Add items from the menu to get started</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-md">
        <h3 className="heading-lg">Your Cart</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClear}><Trash2 size={14} /> Clear</button>
      </div>

      {/* Two counter split */}
      {cartByCounter.thali.length > 0 && (
        <div className="mb-md">
          <div className="caption text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>🍱 Thali Counter</div>
          {cartByCounter.thali.map(item => (
            <CartItemRow key={item.menuItemId} item={item} onRemove={() => onRemove(item.menuItemId)} />
          ))}
        </div>
      )}

      {cartByCounter.dishes.length > 0 && (
        <div className="mb-md">
          <div className="caption text-muted mb-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>🍴 Dishes Counter</div>
          {cartByCounter.dishes.map(item => (
            <CartItemRow key={item.menuItemId} item={item} onRemove={() => onRemove(item.menuItemId)} />
          ))}
        </div>
      )}

      <div className="divider" />
      <div className="flex justify-between items-center mb-lg">
        <span className="heading-md">Total</span>
        <span className="heading-lg text-success">₹{cartTotal}</span>
      </div>

      {cartByCounter.thali.length > 0 && cartByCounter.dishes.length > 0 && (
        <AlertBanner type="info" icon={Info} message="Your order will be split between Thali and Dishes counters automatically." />
      )}

      <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 'var(--space-md)' }} onClick={onProceed}>
        Select Pickup Slot →
      </button>
    </div>
  );
}

function CartItemRow({ item, onRemove }) {
  return (
    <div className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-sm">
        <span>{item.emoji}</span>
        <div>
          <div className="label">{item.name}</div>
          <div className="caption text-muted">×{item.qty}</div>
        </div>
      </div>
      <div className="flex items-center gap-sm">
        <span className="label">₹{item.price * item.qty}</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} style={{ color: 'var(--color-danger)' }}><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

// ─── Slot Panel ─────────────────────────────────────────────
function SlotPanel({ slots, selected, onSelect, notes, onNotes, onBack, onProceed }) {
  return (
    <div className="card">
      <h3 className="heading-lg mb-md">Select Pickup Slot</h3>
      <div className="mb-lg">
        <SlotPicker slots={slots} selected={selected} onSelect={onSelect} />
      </div>
      <div className="form-group mb-md">
        <label className="form-label">Special Instructions (optional)</label>
        <textarea className="form-input form-textarea" style={{ minHeight: 70 }} placeholder="Less spicy, no coriander…" value={notes} onChange={e => onNotes(e.target.value)} />
      </div>
      <div className="flex gap-sm">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-primary flex-1" disabled={!selected} onClick={onProceed}>Proceed to Pay →</button>
      </div>
    </div>
  );
}

// ─── Payment Panel ──────────────────────────────────────────
function PaymentPanel({ cart, cartTotal, slot, payMethod, setPayMethod, onBack, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(res => setTimeout(res, 1200));
    onConfirm();
    setLoading(false);
  };

  return (
    <div className="card">
      <h3 className="heading-lg mb-md">Payment</h3>

      {/* Order Summary */}
      <div className="card-glass mb-md" style={{ padding: 'var(--space-md)' }}>
        {cart.map(item => (
          <div key={item.menuItemId} className="flex justify-between mb-xs">
            <span className="body-sm">{item.emoji} {item.name} ×{item.qty}</span>
            <span className="label">₹{item.price * item.qty}</span>
          </div>
        ))}
        <div className="divider" />
        <div className="flex justify-between">
          <span className="heading-sm">Total</span>
          <span className="heading-sm text-success">₹{cartTotal}</span>
        </div>
        {slot && <div className="caption text-muted" style={{ marginTop: 6 }}>📍 Pickup: {slot.label}</div>}
      </div>

      {/* Payment Methods */}
      <div className="mb-md">
        <div className="form-label mb-sm">Payment Method</div>
        {['UPI', 'Card', 'Mess Wallet', 'Cash (at counter)'].map(m => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: payMethod === m ? 'rgba(108,99,255,0.1)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: `1px solid ${payMethod === m ? 'var(--brand-primary)' : 'var(--border-subtle)'}`, cursor: 'pointer', marginBottom: 6 }} onClick={() => setPayMethod(m)}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${payMethod === m ? 'var(--brand-primary)' : 'var(--border-default)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {payMethod === m && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)' }} />}
            </div>
            <span className="label">{m}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-sm">
        <button className="btn btn-ghost flex-1" onClick={onBack}>← Back</button>
        <button className="btn btn-success flex-1" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-sm">
              <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#0A0B14', borderRadius: '50%' }} />
              Processing…
            </span>
          ) : (
            <><CheckCircle size={16} /> Pay ₹{cartTotal}</>
          )}
        </button>
      </div>
    </div>
  );
}


