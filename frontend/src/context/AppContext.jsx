import { createContext, useContext, useState, useCallback } from 'react';
import {
  USERS, ROLES,
  MENU_ITEMS_INITIAL, PICKUP_SLOTS_INITIAL,
  ORDERS_INITIAL, NOTIFICATIONS_INITIAL,
  SUBSCRIPTION_PLANS, ORDER_STATUS,
} from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [menuItems, setMenuItems] = useState(MENU_ITEMS_INITIAL);
  const [slots, setSlots] = useState(PICKUP_SLOTS_INITIAL);
  const [orders, setOrders] = useState(ORDERS_INITIAL);
  const [notifications, setNotifications] = useState(NOTIFICATIONS_INITIAL);
  const [cart, setCart] = useState([]);
  const [subscriptions] = useState(SUBSCRIPTION_PLANS);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = useCallback((email, password, role) => {
    const user = USERS.find(u => u.email === email || u.role === role);
    if (user) {
      setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, error: 'Invalid credentials' };
  }, []);

  const loginByRole = useCallback((role) => {
    const user = USERS.find(u => u.role === role);
    if (user) { setCurrentUser(user); return user; }
    return null;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCart([]);
  }, []);

  // ── Cart ─────────────────────────────────────────────────────────────────────
  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, counter: item.counter, emoji: item.emoji }];
    });
  }, []);

  const removeFromCart = useCallback((menuItemId) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (!existing) return prev;
      if (existing.qty === 1) return prev.filter(c => c.menuItemId !== menuItemId);
      return prev.map(c => c.menuItemId === menuItemId ? { ...c, qty: c.qty - 1 } : c);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  // ── Orders ───────────────────────────────────────────────────────────────────
  const placeOrder = useCallback((slotId, notes = '') => {
    if (!currentUser || cart.length === 0) return null;
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return null;

    const newOrder = {
      id: `MS${10290 + orders.length}`,
      userId: currentUser.id,
      studentName: currentUser.name,
      studentUID: currentUser.uid,
      items: cart.map(c => ({ menuItemId: c.menuItemId, name: c.name, qty: c.qty, price: c.price, counter: c.counter })),
      total: cartTotal,
      slotId,
      slotLabel: slot.label,
      status: ORDER_STATUS.CONFIRMED,
      thaliStatus: cart.some(c => c.counter === 'thali') ? 'preparing' : 'na',
      dishesStatus: cart.some(c => c.counter === 'dishes') ? 'preparing' : 'na',
      createdAt: new Date().toISOString(),
      meal: 'lunch',
      paymentConfirmed: true,
      paymentMethod: 'UPI',
      qrVerified: false,
      qrScannedAt: null,
      notes,
    };

    setOrders(prev => [newOrder, ...prev]);
    // Update inventory
    setMenuItems(prev => prev.map(item => {
      const cartItem = cart.find(c => c.menuItemId === item.id);
      if (!cartItem) return item;
      const newQty = Math.max(0, item.qty - cartItem.qty);
      return { ...item, qty: newQty, available: newQty > 0 };
    }));
    // Update slot booking
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, booked: s.booked + 1 } : s));
    clearCart();
    // Add notification
    setNotifications(prev => [{
      id: `n${Date.now()}`,
      title: 'Order Placed!',
      message: `Order ${newOrder.id} confirmed. Pick up at ${slot.label}.`,
      type: 'success', time: 'Just now', read: false,
    }, ...prev]);
    return newOrder;
  }, [currentUser, cart, cartTotal, orders.length, slots, clearCart]);

  const cancelOrder = useCallback((orderId) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      if (o.status === ORDER_STATUS.PREPARING || o.status === ORDER_STATUS.READY || o.status === ORDER_STATUS.COMPLETED) return o;
      return { ...o, status: ORDER_STATUS.CANCELLED };
    }));
  }, []);

  const markOrderServed = useCallback((orderId, counter) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const thaliStatus = counter === 'thali' ? 'served' : o.thaliStatus;
      const dishesStatus = counter === 'dishes' ? 'served' : o.dishesStatus;
      const thaliDone = thaliStatus === 'served' || thaliStatus === 'na';
      const dishesDone = dishesStatus === 'served' || dishesStatus === 'na';
      const newStatus = thaliDone && dishesDone ? ORDER_STATUS.COMPLETED : ORDER_STATUS.PARTIALLY_SERVED;
      return { ...o, thaliStatus, dishesStatus, status: newStatus, qrVerified: true, qrScannedAt: new Date().toISOString() };
    }));
  }, []);

  const updateOrderStatus = useCallback((orderId, status) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }, []);

  const rateOrder = useCallback((orderId, rating) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, rating } : o));
  }, []);

  // ── Menu Management ───────────────────────────────────────────────────────────
  const updateMenuItem = useCallback((id, updates) => {
    setMenuItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const addMenuItem = useCallback((item) => {
    const newItem = { ...item, id: `m${Date.now()}`, qty: item.initialQty, rating: 0 };
    setMenuItems(prev => [...prev, newItem]);
  }, []);

  const deleteMenuItem = useCallback((id) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // ── Notifications ─────────────────────────────────────────────────────────────
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Getters ───────────────────────────────────────────────────────────────────
  const myOrders = currentUser ? orders.filter(o => o.userId === currentUser.id) : [];
  const activeOrders = myOrders.filter(o => o.status !== ORDER_STATUS.COMPLETED && o.status !== ORDER_STATUS.CANCELLED);
  const thaliOrders = orders.filter(o => o.items.some(i => i.counter === 'thali') && o.status !== ORDER_STATUS.COMPLETED && o.status !== ORDER_STATUS.CANCELLED);
  const dishesOrders = orders.filter(o => o.items.some(i => i.counter === 'dishes') && o.status !== ORDER_STATUS.COMPLETED && o.status !== ORDER_STATUS.CANCELLED);
  const availableSlots = slots.filter(s => s.active && s.booked < s.capacity);
  const lunchMenuItems = menuItems;

  return (
    <AppContext.Provider value={{
      // Auth
      currentUser, login, loginByRole, logout,
      // Cart
      cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount,
      // Orders
      orders, myOrders, activeOrders, thaliOrders, dishesOrders,
      placeOrder, cancelOrder, markOrderServed, updateOrderStatus, rateOrder,
      // Menu
      menuItems, lunchMenuItems, updateMenuItem, addMenuItem, deleteMenuItem,
      // Slots
      slots, availableSlots,
      // Notifications
      notifications, unreadCount, markAllRead,
      // Subscriptions
      subscriptions,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
