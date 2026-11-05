import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ORDER_STATUS, ROLES } from '../lib/constants';
import { toSessionUser } from '../lib/session';
import { addItem, removeItem, reconcileCart, cartTotals } from '../lib/cart';

const AppContext = createContext(null);

/** Orders sorted by order time, newest first (order history, dashboards and tickets all rely on it). */
const newestFirst = (list) => [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

const TOKEN_KEY = 'mealsync_jwt';
const TOKEN_KEY_LEGACY = 'mealsync_token';
const USER_KEY = 'mealsync_user';
const THEME_KEY = 'mealsync_theme_choice';

/**
 * Stores only the JWT. The user profile and role are never persisted in the browser: after a
 * reload they are fetched again from /api/auth/me, so editing browser storage cannot change
 * what the UI believes the user's role is (and the backend enforces every permission anyway).
 */
export function saveToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
  // Clean up values written by earlier versions
  for (const key of [TOKEN_KEY_LEGACY, USER_KEY]) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
}

export function loadToken() {
  return sessionStorage.getItem(TOKEN_KEY) ||
         localStorage.getItem(TOKEN_KEY) ||
         sessionStorage.getItem(TOKEN_KEY_LEGACY) ||
         localStorage.getItem(TOKEN_KEY_LEGACY);
}

/** Returns headers with Authorization: Bearer <token> if a token exists. */
export function authHeaders() {
  const token = loadToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  // True while a stored token is being verified with the backend (nothing role-specific renders)
  const [authChecking, setAuthChecking] = useState(() => Boolean(loadToken()));

  // ── Theme ──────────────────────────────────────────────────────────────────
  // Dark is the brand default. Only an explicit toggle is remembered (THEME_KEY); the older
  // key always stored the previous default, so it is ignored.
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  // Real Database States
  const [menuItems, setMenuItems] = useState([]);
  // 'loading' until the first menu response, then 'ready' or 'error' (shown to the user)
  const [menuStatus, setMenuStatus] = useState('loading');
  // Short-lived confirmations and failures shown in the toast region
  const [toasts, setToasts] = useState([]);
  const dismissToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const showToast = useCallback((message, type = 'success') => {
    const id = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), type === 'danger' ? 7000 : 4000);
  }, []);
  const [orders, setOrders] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [orderFetchError, setOrderFetchError] = useState(null);

    // Pickup slots with today's bookings, from the server (capacity is enforced server-side)
  const [slots, setSlots] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [cart, setCart] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // 1. Fetch live menu from Spring Boot — public endpoint
  const fetchMeals = useCallback(async () => {
    try {
      const res = await fetch('/api/meals');
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description || '',
          price: m.price,
          qty: m.availableQuantity != null ? m.availableQuantity : 0,
          initialQty: m.availableQuantity != null ? Math.max(m.availableQuantity, 50) : 50,
          // visible: shown on the student menu (admin switch); available: visible and in stock
          visible: Boolean(m.isAvailable),
          available: Boolean(m.isAvailable) && (m.availableQuantity == null || m.availableQuantity > 0),
          category: m.category || 'meals',
          imageUrl: m.imageUrl || null,
        }));
        setMenuItems(mapped);
        setMenuStatus('ready');
      } else {
        setMenuStatus(prev => (prev === 'ready' ? prev : 'error'));
      }
    } catch (err) {
      console.error('Failed to fetch meals', err);
      setMenuStatus(prev => (prev === 'ready' ? prev : 'error'));
    }
  }, []);

  // Initial fetch and token verification with /api/auth/me
  useEffect(() => {
    fetchMeals();

    const token = loadToken();
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Token verification failed');
        })
        .then(data => {
          setCurrentUser(toSessionUser(data));
        })
        .catch(() => {
          // Invalid or expired token: start signed out
          saveToken(null);
          setCurrentUser(null);
        })
        .finally(() => setAuthChecking(false));
    }
  }, [fetchMeals]);

  // Real-time stock polling: refresh menu every 3 seconds so inventory changes are shared across all sessions
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchMeals();
    }, 3000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMeals();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchMeals]);

  // 2. Fetch live orders when user logs in — role specific
  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;

    try {
      if (currentUser.role === ROLES.ADMIN) {
        // Admin: fetch all orders
        const res = await fetch('/api/admin/orders', {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          const mappedOrders = data.map(o => ({
            id: o.orderNumber || `MS${o.id}`,
            dbId: o.id,
            userId: o.user?.id,
            studentName: o.user?.name || o.customerName || 'Walk-in customer',
            studentEmail: o.user?.email || o.customerEmail || '',
            orderSource: o.orderSource || 'PORTAL',
            customerName: o.user?.name || o.customerName || '',
            items: (o.items || []).map(i => ({
              menuItemId: i.meal?.id,
              name: i.itemName || i.meal?.name || 'Item unavailable',
              qty: i.quantity,
              price: i.priceAtTimeOfOrder,
              category: i.meal?.category,
              imageUrl: i.meal?.imageUrl || null,
            })),
            total: o.totalAmount,
            slotLabel: o.pickupSlot,
            status: o.status,
            createdAt: o.orderTimeUtc || o.orderTime,
            qrCodeData: o.qrCodeData,
            payMethod: o.paymentMethod || 'UPI',
            paymentStatus: o.paymentStatus || 'PAID',
            transactionId: o.transactionId,
            qrVerified: o.status === 'COMPLETED',
          }));
          setOrders(newestFirst(mappedOrders));
        }

        // Also fetch admin overview stats
        const ovRes = await fetch('/api/admin/overview', {
          headers: authHeaders(),
        });
        if (ovRes.ok) {
          const ovData = await ovRes.json();
          setAdminOverview(ovData);
        }
      } else {
        // Student: fetch student's own orders
        const res = await fetch(`/api/orders/user/${currentUser.id}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setOrderFetchError(null);
          const mappedOrders = data.map(o => ({
            id: o.orderNumber || `MS${o.id}`,
            dbId: o.id,
            userId: currentUser.id,
            studentName: o.customerName || currentUser.name,
            items: (o.items || []).map(i => ({
              menuItemId: i.meal?.id,
              name: i.itemName || i.meal?.name || 'Item unavailable',
              qty: i.quantity,
              price: i.priceAtTimeOfOrder,
              category: i.meal?.category,
              imageUrl: i.meal?.imageUrl || null,
            })),
            total: o.totalAmount,
            slotLabel: o.pickupSlot,
            status: o.status,
            createdAt: o.orderTimeUtc || o.orderTime,
            qrCodeData: o.qrCodeData,
            payMethod: o.paymentMethod || 'UPI',
            paymentStatus: o.paymentStatus || 'PAID',
            transactionId: o.transactionId,
            orderSource: o.orderSource || 'PORTAL',
            qrVerified: o.status === 'COMPLETED',
          }));
          setOrders(newestFirst(mappedOrders));
        } else if (res.status === 401) {
          setOrderFetchError('Authentication expired. Please sign in again to view your orders.');
        } else {
          setOrderFetchError(`Unable to load orders (Status ${res.status})`);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
      setOrderFetchError('Network error while loading order history');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.id) {
      fetchOrders();
    }
  }, [currentUser, fetchOrders]);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch('/api/slots', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        // `meal` kept as an alias of mealPeriod for existing components
        setSlots(data.map(s => ({ ...s, meal: s.mealPeriod })));
      }
    } catch (err) {
      console.error('Failed to load pickup slots', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.id) fetchSlots();
  }, [currentUser?.id, fetchSlots]);

  // Keep the signed-in identity in sync with the server: a role granted or removed by an
  // administrator shows up without re-login, and an expired token signs the user out.
  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const recheck = async () => {
      const token = loadToken();
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 401) {
          saveToken(null);
          setCurrentUser(null);
          return;
        }
        if (!res.ok) return;
        const fresh = toSessionUser(await res.json());
        setCurrentUser(prev => (prev && fresh && (prev.isAdmin !== fresh.isAdmin || prev.name !== fresh.name) ? { ...prev, ...fresh } : prev));
      } catch {
        // network hiccup: keep the current state
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') recheck(); };
    const timer = setInterval(recheck, 60000);
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [currentUser?.id]);

  // ── Auth ────────────────────────────────────────────────────────────────────

  /** Signs in with a /api/auth/login response; the role is taken from the server only. */
  const completeLogin = useCallback((loginResponse) => {
    const user = toSessionUser(loginResponse);
    if (!user || !loginResponse.token) return false;
    saveToken(loginResponse.token);
    setCurrentUser(user);
    return true;
  }, []);

  const logout = useCallback(() => {
    saveToken(null);
    setCurrentUser(null);
    setCart([]);
    setOrders([]);
    setAdminOverview(null);
    setSubscriptions([]);
  }, []);

  // ── Cart ─────────────────────────────────────────────────────────────────────

  const addToCart = useCallback((item) => {
    setCart(prev => addItem(prev, item));
  }, []);

  const removeFromCart = useCallback((menuItemId) => {
    setCart(prev => removeItem(prev, menuItemId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // Keep the cart consistent with the live menu (prices, remaining stock, availability)
  useEffect(() => {
    setCart(prev => reconcileCart(prev, menuItems));
  }, [menuItems]);

  const { total: cartTotal, count: cartCount } = cartTotals(cart);
  const cartHasUnavailable = cart.some(c => c.unavailable);

  // ── Student Orders ──────────────────────────────────────────────────────────

  const placeOrder = useCallback(async (slotId, notes = '', payMethod = 'UPI', simulateFailure = false, idempotencyKey = null) => {
    if (!currentUser) return { error: 'Please sign in to place an order.' };
    if (cart.length === 0) return { error: 'Your cart is empty. Please add items.' };
    if (cart.some(c => c.unavailable)) return { error: 'Some items in your cart are no longer available. Remove them to continue.' };

    const slot = slots.find(s => s.id === slotId);
    if (!slot) return { error: 'Please select a valid pickup slot.' };

    const ik = idempotencyKey || ('ik_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          pickupSlot: slot.label,
          paymentMethod: payMethod,
          items: cart.map(c => ({
            menuItemId: c.menuItemId,
            qty: c.qty,
          })),
          idempotencyKey: ik,
          simulateFailure: Boolean(simulateFailure),
        }),
      });

      if (res.ok) {
        const savedOrder = await res.json();

        const newOrder = {
          id: savedOrder.orderNumber,
          dbId: savedOrder.id,
          userId: currentUser.id,
          studentName: currentUser.name,
          items: cart.map(c => ({
            menuItemId: c.menuItemId,
            name: c.name,
            qty: c.qty,
            price: c.price,
            category: c.category,
            imageUrl: c.imageUrl || null,
          })),
          total: savedOrder.totalAmount, // Trusted DB total calculated server-side
          slotId,
          slotLabel: slot.label,
          status: savedOrder.status,
          createdAt: savedOrder.orderTimeUtc || savedOrder.orderTime,
          notes,
          payMethod: savedOrder.paymentMethod || payMethod,
          paymentStatus: savedOrder.paymentStatus || 'PAID',
          transactionId: savedOrder.transactionId || null,
          qrCodeData: savedOrder.qrCodeData || savedOrder.orderNumber,
          orderSource: savedOrder.orderSource || 'PORTAL',
        };

        setOrders(prev => [newOrder, ...prev]);
        clearCart();
        await fetchMeals(); // Live menu stock update immediately across UI
        fetchOrders();      // Replace the optimistic entry with server data (prices, status)
        fetchSlots();       // Slot bookings changed

        const paymentNote = newOrder.paymentStatus === 'PENDING_CASH'
          ? 'Payment: Cash on counter upon pickup'
          : `Payment Simulated & Verified (TXN: ${newOrder.transactionId || 'SUCCESS'})`;

        setNotifications(prev => [{
          id: `n${Date.now()}`,
          title: 'Order Confirmed!',
          message: `Order ${newOrder.id} confirmed. Total: ₹${newOrder.total}. ${paymentNote}`,
          type: 'success', time: 'Just now', read: false,
        }, ...prev]);

        return newOrder;
      } else {
        const errData = await res.json().catch(() => ({}));
        return { error: errData.error || `Order failed with status ${res.status}` };
      }
    } catch (e) {
      console.error('Failed to post order to backend', e);
      return { error: 'Unable to connect to the backend server. Please verify Spring Boot is running.' };
    }
  }, [currentUser, cart, slots, clearCart, fetchMeals, fetchOrders, fetchSlots]);

  // ── Counter Sales (Admin Priority 3) ───────────────────────────────────────

  const createCounterOrder = useCallback(async (counterOrderData) => {
    try {
      const res = await fetch('/api/admin/counter-orders', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(counterOrderData),
      });

      if (res.ok) {
        const savedOrder = await res.json();
        await fetchMeals(); // stock refresh across UI
        await fetchOrders(); // refresh admin orders
        return { success: true, order: savedOrder };
      } else {
        const errData = await res.json().catch(() => ({}));
        return { error: errData.error || `Counter sale failed with status ${res.status}` };
      }
    } catch (err) {
      console.error('Counter order request failed:', err);
      return { error: err.message || 'Network error while placing counter order' };
    }
  }, [fetchMeals, fetchOrders]);

  // ── Profile Updating (Priority 7) ──────────────────────────────────────────

  const updateProfile = useCallback(async (profileData) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(profileData),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUser = {
          ...currentUser,
          name: data.name,
          phone: data.phone,
          uid: data.uid,
        };
        setCurrentUser(updatedUser);
        return { success: true, user: updatedUser };
      } else {
        const err = await res.json().catch(() => ({}));
        return { error: err.error || 'Failed to update profile' };
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      return { error: err.message || 'Network error' };
    }
  }, [currentUser]);

  const cancelOrder = useCallback(async (orderId) => {
    const target = orders.find(o => o.id === orderId || o.dbId === orderId);
    const dbId = target?.dbId || orderId;

    try {
      const res = await fetch(`/api/orders/${dbId}/cancel`, {
        method: 'PUT',
        headers: authHeaders(),
      });

      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => (o.id === orderId || o.dbId === orderId) ? {
          ...o,
          status: updated.status,
          paymentStatus: updated.paymentStatus,
        } : o));
        await fetchMeals(); // Stock restored on backend, fetch live values
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { error: err.error || 'Failed to cancel order' };
      }
    } catch (e) {
      // Never pretend a cancellation happened: the order is unchanged until the server confirms
      console.warn('Cancel request failed', e);
      return { error: 'Could not reach the server, so the order was not cancelled. Please try again.' };
    }
  }, [orders, fetchMeals]);

  // ── Admin Management ────────────────────────────────────────────────────────

  const addMenuItem = useCallback(async (productData) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: productData.name,
          description: productData.description,
          category: productData.category,
          price: Number(productData.price),
          availableQuantity: Number(productData.availableQuantity || productData.qty || 50),
          isAvailable: productData.isAvailable !== false,
          imageUrl: productData.imageUrl || null,
        }),
      });

      if (res.ok) {
        await fetchMeals();
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { error: err.error || 'Failed to create product' };
      }
    } catch (e) {
      return { error: 'Failed to connect to backend' };
    }
  }, [fetchMeals]);

  const updateMenuItem = useCallback(async (id, productData) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: productData.name,
          description: productData.description,
          category: productData.category,
          price: Number(productData.price),
          availableQuantity: Number(productData.availableQuantity ?? productData.qty ?? 50),
          isAvailable: productData.isAvailable ?? productData.available ?? true,
          imageUrl: productData.imageUrl || null,
        }),
      });

      if (res.ok) {
        await fetchMeals();
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { error: err.error || 'Failed to update product' };
      }
    } catch (e) {
      return { error: 'Failed to connect to backend' };
    }
  }, [fetchMeals]);

  const toggleMenuItemAvailability = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/admin/products/${id}/toggle-availability`, {
        method: 'PATCH',
        headers: authHeaders(),
      });
      if (res.ok) {
        await fetchMeals();
        return { success: true };
      }
    } catch (e) {
      console.error('Failed to toggle availability', e);
    }
    return { error: 'Failed to update availability' };
  }, [fetchMeals]);

  const deleteMenuItem = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (res.ok) {
        await fetchMeals();
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { error: err.error || 'Failed to deactivate product' };
      }
    } catch (e) {
      return { error: 'Failed to connect to backend' };
    }
  }, [fetchMeals]);

  const updateOrderStatus = useCallback(async (orderId, targetStatus) => {
    const targetOrder = orders.find(o => o.id === orderId || o.dbId === orderId);
    const dbId = targetOrder?.dbId || orderId;

    try {
      const res = await fetch(`/api/admin/orders/${dbId}/status`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: targetStatus }),
      });

      if (res.ok) {
        await fetchOrders();
        await fetchMeals(); // stock might have been restored on cancellation
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { error: err.error || 'Invalid status transition' };
      }
    } catch (e) {
      // The status is unchanged until the server confirms it
      console.warn('Status update failed', e);
      return { error: 'Could not reach the server, so the status was not changed. Please try again.' };
    }
  }, [orders, fetchOrders, fetchMeals]);

  // ── Notifications ─────────────────────────────────────────────────────────────

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Subscriptions (persisted by the backend) ────────────────────────────────

  const fetchSubscriptions = useCallback(async () => {
    const [plansRes, mineRes] = await Promise.all([
      fetch('/api/subscriptions/plans', { headers: authHeaders() }),
      fetch('/api/subscriptions/me', { headers: authHeaders() }),
    ]);
    if (!plansRes.ok || !mineRes.ok) {
      const failed = !plansRes.ok ? plansRes : mineRes;
      const err = await failed.json().catch(() => ({}));
      throw new Error(err.error || `Could not load subscriptions (status ${failed.status})`);
    }
    setSubscriptionPlans(await plansRes.json());
    setSubscriptions(await mineRes.json());
  }, []);

  /** Runs a subscription request and refreshes the list; returns { success } or { error }. */
  const runSubscriptionRequest = useCallback(async (url, body) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data.error || `Request failed (status ${res.status})` };
      await fetchSubscriptions();
      return { success: true, subscription: data };
    } catch {
      return { error: 'Network error — the request may not have been applied. Refresh to check.' };
    }
  }, [fetchSubscriptions]);

  const subscribeToPlan = useCallback((planCode, paymentMethod) =>
    runSubscriptionRequest('/api/subscriptions', { planCode, paymentMethod }), [runSubscriptionRequest]);

  const changeSubscription = useCallback((subscriptionId, action) =>
    runSubscriptionRequest(`/api/subscriptions/${subscriptionId}/${action}`), [runSubscriptionRequest]);

  // ── Administrator: user roles ────────────────────────────────────────────────

  const fetchUsers = useCallback(async (query = '') => {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Could not load users (status ${res.status})`);
    return data;
  }, []);

  const changeUserRole = useCallback(async (userId, role) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data.error || `Role change failed (status ${res.status})` };
      return { success: true, user: data };
    } catch {
      return { error: 'Network error while changing the role' };
    }
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────────

  // Dishes on the student menu; hidden and retired dishes are only listed in the Product catalog
  const liveMenu = menuItems.filter(m => m.visible);

  const myOrders = currentUser ? orders.filter(o => o.userId === currentUser.id) : [];
  // Backend statuses are upper case (CONFIRMED, COMPLETED, CANCELLED…); compare case-insensitively
  const activeOrders = myOrders.filter(o => {
    const st = String(o.status || '').toLowerCase();
    return st !== ORDER_STATUS.COMPLETED && st !== ORDER_STATUS.CANCELLED;
  });
  const availableSlots = slots.filter(s => s.active && s.booked < s.capacity);

  return (
    <AppContext.Provider value={{
      // Auth
      currentUser, authChecking, logout, completeLogin,
      // Cart
      cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount, cartHasUnavailable,
      // Orders
      orders, myOrders, activeOrders, orderFetchError,
      placeOrder, createCounterOrder, cancelOrder, updateOrderStatus,
      fetchOrders,
      // Profile
      updateProfile,
      // Menu
      menuItems, liveMenu, menuStatus,
      fetchMeals,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleMenuItemAvailability,
      // Admin Overview
      adminOverview,
      // Slots
      slots, availableSlots, fetchSlots,
      // Notifications
      notifications, unreadCount, markAllRead,
      // Toasts
      toasts, showToast, dismissToast,
      // Subscriptions
      subscriptionPlans, subscriptions, fetchSubscriptions, subscribeToPlan, changeSubscription,
      // Administrator: user roles
      fetchUsers, changeUserRole,
      // Theme (Light/Dark mode)
      theme, toggleTheme,
      // Auth Helpers
      authHeaders, loadToken,
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
