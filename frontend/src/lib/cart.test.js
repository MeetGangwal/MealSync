import { describe, it, expect } from 'vitest';
import { addItem, removeItem, reconcileCart, cartTotals, isOrderable } from './cart';

const thali = { id: 1, name: 'Thali', price: 120, qty: 2, available: true, category: 'thali' };
const chai = { id: 2, name: 'Chai', price: 15, qty: 10, available: true, category: 'beverages' };
const soldOut = { id: 3, name: 'Dosa', price: 45, qty: 0, available: false };

describe('addItem / removeItem', () => {
  it('adds a new line and increments existing lines', () => {
    let cart = addItem([], thali);
    expect(cart).toEqual([expect.objectContaining({ menuItemId: 1, qty: 1, price: 120 })]);
    cart = addItem(cart, thali);
    expect(cart[0].qty).toBe(2);
  });

  it('never exceeds remaining stock', () => {
    let cart = addItem(addItem([], thali), thali);
    const again = addItem(cart, thali);
    expect(again).toBe(cart);
    expect(again[0].qty).toBe(2);
  });

  it('does not add sold-out items', () => {
    expect(addItem([], soldOut)).toEqual([]);
    expect(isOrderable(soldOut)).toBe(false);
  });

  it('removes one unit, then the whole line', () => {
    let cart = addItem(addItem([], chai), chai);
    cart = removeItem(cart, 2);
    expect(cart[0].qty).toBe(1);
    expect(removeItem(cart, 2)).toEqual([]);
    expect(removeItem([], 99)).toEqual([]);
  });
});

describe('reconcileCart (cart follows the live menu)', () => {
  it('returns the same array when nothing changed', () => {
    const cart = addItem([], chai);
    expect(reconcileCart(cart, [chai, thali])).toBe(cart);
  });

  it('updates prices and caps quantities to remaining stock', () => {
    const cart = [{ menuItemId: 2, name: 'Chai', price: 15, qty: 8 }];
    const next = reconcileCart(cart, [{ ...chai, price: 18, qty: 5 }]);
    expect(next[0]).toMatchObject({ price: 18, qty: 5, unavailable: false });
  });

  it('flags items that sold out or were removed from the menu', () => {
    const cart = [{ menuItemId: 3, name: 'Dosa', price: 45, qty: 1 }, { menuItemId: 42, name: 'Gone', price: 10, qty: 2 }];
    const next = reconcileCart(cart, [soldOut, chai]);
    expect(next.map(l => l.unavailable)).toEqual([true, true]);
  });

  it('leaves the cart alone while the menu has not loaded', () => {
    const cart = [{ menuItemId: 2, name: 'Chai', price: 15, qty: 1 }];
    expect(reconcileCart(cart, [])).toBe(cart);
  });
});

describe('cartTotals', () => {
  it('sums orderable lines and excludes unavailable ones', () => {
    const totals = cartTotals([
      { menuItemId: 1, price: 120, qty: 2 },
      { menuItemId: 2, price: 15, qty: 3 },
      { menuItemId: 3, price: 45, qty: 1, unavailable: true },
    ]);
    expect(totals).toEqual({ count: 5, total: 285 });
  });
});
