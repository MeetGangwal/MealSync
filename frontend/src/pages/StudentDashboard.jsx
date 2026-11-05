import { useEffect } from 'react';
import { ShoppingBag, ArrowRight, QrCode, ClipboardList, UtensilsCrossed, CalendarCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge, MealImage, EmptyState } from '../components/Shared';
import { counterFor } from '../components/MenuCatalog';
import { isOrderable } from '../lib/cart';
import { menuImageFor } from '../lib/menuImages';
import { formatDateTime } from '../lib/format';
import { slotHasEnded } from '../lib/slots';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/** Student home: the next useful action first, then today's slots and menu, then recent orders. */
export default function StudentDashboard({ setPage }) {
  const { currentUser, liveMenu: menuItems, menuStatus, slots, myOrders, activeOrders, cartCount, cartTotal, subscriptions } = useApp();
  const { fetchSubscriptions } = useApp();
  // Meal plan summary (failures are non-blocking here; the Meal plans page shows errors)
  useEffect(() => { fetchSubscriptions().catch(() => {}); }, [fetchSubscriptions]);
  const firstName = (currentUser?.name || '').split(' ')[0];
  const nextOrder = activeOrders[0];
  const openSlots = slots.filter(s => s.active && s.booked < s.capacity && !slotHasEnded(s));
  const featured = menuItems.filter(i => isOrderable(i) && menuImageFor(i)).slice(0, 10);
  const heroDish = menuItems.find(i => i.category === 'thali' && isOrderable(i) && menuImageFor(i)) || featured[0];
  const activePlan = subscriptions.find(s => s.status === 'ACTIVE' || s.status === 'PAUSED');

  return (
    <div>
      <section className="welcome" aria-labelledby="welcome-title">
        <div className="welcome-text">
          <span className="eyebrow">{greeting()}</span>
          <h1 id="welcome-title" className="display-lg">{firstName ? `Hi ${firstName}, hungry?` : 'Hungry?'}</h1>
          <p className="body-lg text-secondary">
            {nextOrder
              ? `Your order ${nextOrder.id} is ${String(nextOrder.status).toLowerCase() === 'ready' ? 'ready to collect' : 'in the queue'} for the ${nextOrder.slotLabel} slot.`
              : cartCount > 0
                ? `You have ${cartCount} item${cartCount === 1 ? '' : 's'} (₹${cartTotal}) waiting in your order.`
                : 'Pick a few dishes, choose a pickup slot and skip the queue.'}
          </p>
          <div className="hero-cta">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setPage('order')}>
              <ShoppingBag size={18} aria-hidden="true" /> {cartCount > 0 ? 'Finish your order' : 'Place an order'}
            </button>
            <button type="button" className="btn btn-outline btn-lg" onClick={() => setPage('menu')}>Browse today’s menu</button>
          </div>
        </div>
        {heroDish && (
          <div className="welcome-media">
            <MealImage item={heroDish} alt={heroDish.name} eager />
          </div>
        )}
      </section>

      {nextOrder && (
        <section className="section" aria-labelledby="next-title">
          <div className="section-head">
            <h2 id="next-title" className="heading-lg">Your next pickup</h2>
            {activeOrders.length > 1 && <span className="caption text-muted">{activeOrders.length} active orders</span>}
          </div>
          <div className="card next-up">
            <div className="next-up-row">
              <div className="flex flex-col gap-xs">
                <span className="heading-lg">{nextOrder.id}</span>
                <span className="body-sm text-secondary">
                  {nextOrder.slotLabel} · {[...new Set(nextOrder.items.map(i => counterFor(i.category)))].join(' and ')}
                </span>
              </div>
              <StatusBadge status={nextOrder.status} />
            </div>
            <p className="body-sm text-secondary">{nextOrder.items.map(i => `${i.qty} × ${i.name}`).join(', ')}</p>
            <div className="card-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPage('qr')}><QrCode size={15} aria-hidden="true" /> Show QR ticket</button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage('my-orders')}>Track order</button>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-2 gap-lg section">
        <section className="card" aria-labelledby="slots-title">
          <div className="section-head">
            <h2 id="slots-title" className="heading-lg">Pickup slots today</h2>
            <span className="caption text-muted">{openSlots.length} open</span>
          </div>
          {slots.length === 0 ? (
            <p className="body-sm text-muted">Loading slots…</p>
          ) : openSlots.length === 0 ? (
            <p className="body-sm text-secondary">No more pickup slots are open today.</p>
          ) : (
            <ul className="row-list">
              {openSlots.slice(0, 5).map(slot => (
                <li key={slot.id} className="row-item">
                  <div className="row-item-main">
                    <span className="label">{slot.label}</span>
                    <span className="caption text-muted capitalize">{slot.mealPeriod}</span>
                  </div>
                  <span className="caption text-secondary tabular">{slot.capacity - slot.booked} of {slot.capacity} left</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="recent-title">
          <div className="section-head">
            <h2 id="recent-title" className="heading-lg">Recent orders</h2>
            {myOrders.length > 0 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage('my-orders')}>View order history</button>}
          </div>
          {myOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No orders yet" message="Your first order will show up here with its status." />
          ) : (
            <ul className="row-list">
              {myOrders.slice(0, 4).map(o => (
                <li key={o.id} className="row-item">
                  <div className="row-item-main">
                    <span className="label">{o.id} · ₹{o.total}</span>
                    <span className="caption text-muted truncate">{formatDateTime(o.createdAt)} · {o.items.map(i => i.name).join(', ')}</span>
                  </div>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="section" aria-labelledby="dishes-title">
        <div className="section-head">
          <h2 id="dishes-title" className="heading-lg">On the menu today</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPage('menu')}>See the full menu <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        {menuStatus === 'error' && featured.length === 0 ? (
          <p className="body-sm text-secondary">The menu couldn’t be loaded right now.</p>
        ) : featured.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} title="Nothing in stock right now" message="Check back closer to the next meal." />
        ) : (
          <div className="dish-strip">
            {featured.map(item => (
              <button key={item.id} type="button" className="dish-tile" onClick={() => setPage('menu')} aria-label={`${item.name}, ₹${item.price}. Open today’s menu`}>
                <MealImage item={item} alt="" />
                <span className="label">{item.name}</span>
                <span className="caption text-muted">₹{item.price} · {item.qty} left</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {activePlan && (
        <section className="card flex justify-between items-center gap-md flex-wrap" aria-label="Meal plan">
          <div className="flex items-center gap-md">
            <span className="stat-icon" aria-hidden="true"><CalendarCheck size={18} /></span>
            <div className="flex flex-col">
              <span className="label">{activePlan.planName} · {activePlan.status === 'PAUSED' ? 'paused' : 'active'}</span>
              <span className="caption text-muted">{activePlan.mealsRemaining} meals remaining</span>
            </div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setPage('subscription')}>Manage meal plan</button>
        </section>
      )}
    </div>
  );
}
