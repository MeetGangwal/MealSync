/**
 * Pure cart rules shared by Live Menu and Place Order.
 *
 * The backend recomputes every price and checks stock at checkout; these rules only keep the
 * on-screen cart honest: current menu prices, quantities never above remaining stock, and
 * items that are no longer available flagged instead of silently charged.
 */

/** Adds one unit of a menu item, respecting remaining stock. Returns a new cart. */
export function addItem(cart, item) {
  if (!item || !isOrderable(item)) return cart;
  const existing = cart.find(c => c.menuItemId === item.id);
  const currentQty = existing ? existing.qty : 0;
  if (currentQty >= item.qty) return cart;
  if (existing) {
    return cart.map(c => (c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c));
  }
  return [...cart, {
    menuItemId: item.id,
    name: item.name,
    price: item.price,
    qty: 1,
    category: item.category,
    imageUrl: item.imageUrl || null,
  }];
}

/** Removes one unit (or the line when it reaches zero). Returns a new cart. */
export function removeItem(cart, menuItemId) {
  const existing = cart.find(c => c.menuItemId === menuItemId);
  if (!existing) return cart;
  if (existing.qty <= 1) return cart.filter(c => c.menuItemId !== menuItemId);
  return cart.map(c => (c.menuItemId === menuItemId ? { ...c, qty: c.qty - 1 } : c));
}

export function isOrderable(item) {
  return Boolean(item && item.available && item.qty > 0);
}

/**
 * Brings the cart in line with the latest menu: current price and name, quantity capped at
 * remaining stock, and lines for unavailable or deleted items marked {@code unavailable}.
 * Returns the same array instance when nothing changed (avoids needless re-renders).
 */
export function reconcileCart(cart, menuItems) {
  if (!menuItems || menuItems.length === 0) return cart;
  let changed = false;
  const next = cart.map(line => {
    const item = menuItems.find(m => m.id === line.menuItemId);
    const unavailable = !isOrderable(item);
    const qty = unavailable ? line.qty : Math.min(line.qty, item.qty);
    const price = item ? item.price : line.price;
    const name = item ? item.name : line.name;
    if (qty === line.qty && price === line.price && name === line.name && Boolean(line.unavailable) === unavailable) {
      return line;
    }
    changed = true;
    return { ...line, qty, price, name, unavailable };
  });
  return changed ? next : cart;
}

/** Totals for orderable lines only (unavailable lines are excluded and blocked at checkout). */
export function cartTotals(cart) {
  return cart.reduce((acc, line) => {
    if (line.unavailable) return acc;
    acc.count += line.qty;
    acc.total += line.price * line.qty;
    return acc;
  }, { count: 0, total: 0 });
}
