import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  PICKUP_SLOTS_INITIAL,
  NOTIFICATIONS_INITIAL,
  SUBSCRIPTION_PLANS,
  ORDER_STATUS,
  ROLES,
} from '../data/mockData';

const AppContext = createContext(null);

const TOKEN_KEY = 'mealsync_jwt';
const TOKEN_KEY_LEGACY = 'mealsync_token';
const USER_KEY = 'mealsync_user';

export function saveToken(token, user) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_KEY_LEGACY, token);
    localStorage.setItem(TOKEN_KEY_LEGACY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY_LEGACY);
    localStorage.removeItem(TOKEN_KEY_LEGACY);
  }
  if (user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function loadToken() {
  return sessionStorage.getItem(TOKEN_KEY) ||
         localStorage.getItem(TOKEN_KEY) ||
         sessionStorage.getItem(TOKEN_KEY_LEGACY) ||
         localStorage.getItem(TOKEN_KEY_LEGACY);
}

export function loadSavedUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/** Returns headers with Authorization: Bearer <token> if a token exists. */
export function authHeaders() {
  const token = loadToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => loadSavedUser());

  // ── Theme State (Light / Dark Mode - Priority 13) ──────────────────────────
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mealsync_theme');
    if (saved) return saved;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
    }
    localStorage.setItem('mealsync_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // Real Database States
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [orderFetchError, setOrderFetchError] = useState(null);

  // Mocked States for demo features
  const [slots] = useState(PICKUP_SLOTS_INITIAL);
  const [notifications, setNotifications] = useState(NOTIFICATIONS_INITIAL);
  const [cart, setCart] = useState([]);
  const [subscriptions] = useState(SUBSCRIPTION_PLANS);

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
          available: Boolean(m.isAvailable) && (m.availableQuantity == null || m.availableQuantity > 0),
          category: m.category || 'meals',
          emoji: m.imageUrl || '🍱',
          rating: 4.5,
          popular: (m.price != null && m.price < 50),
        }));
        setMenuItems(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch meals', err);
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
          const frontendRole = data.role === 'ROLE_ADMIN' ? ROLES.ADMIN : ROLES.STUDENT;
          const userObj = {
            id: data.userId,
            name: data.name,
            email: data.email,
            role: frontendRole,
            phone: data.phone || '',
            uid: data.uid || '',
          };
          setCurrentUser(userObj);
          saveToken(token, userObj);
        })
        .catch(err => {
          console.warn('Stored token was invalid or expired', err);
          saveToken(null, null);
          setCurrentUser(null);
        });
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
            studentName: o.user?.name || 'Student',
            studentEmail: o.user?.email || '',
            items: (o.items || []).map(i => ({
              menuItemId: i.meal?.id,
              name: i.meal?.name,
              qty: i.quantity,
              price: i.priceAtTimeOfOrder,
              category: i.meal?.category,
              emoji: i.meal?.imageUrl || '🍱',
            })),
            total: o.totalAmount,
            slotLabel: o.pickupSlot,
            status: o.status,
            createdAt: o.orderTime,
            qrCodeData: o.qrCodeData,
            payMethod: o.paymentMethod || 'UPI',
            paymentStatus: o.paymentStatus || 'PAID',
            transactionId: o.transactionId,
            qrVerified: o.status === 'COMPLETED',
          }));
          setOrders(mappedOrders);
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
              name: i.meal?.name,
              qty: i.quantity,
              price: i.priceAtTimeOfOrder,
              category: i.meal?.category,
              emoji: i.meal?.imageUrl || '🍱',
            })),
            total: o.totalAmount,
            slotLabel: o.pickupSlot,
            status: o.status,
            createdAt: o.orderTime,
            qrCodeData: o.qrCodeData,
            payMethod: o.paymentMethod || 'UPI',
            paymentStatus: o.paymentStatus || 'PAID',
            transactionId: o.transactionId,
            orderSource: o.orderSource || 'PORTAL',
            qrVerified: o.status === 'COMPLETED',
          }));
          setOrders(mappedOrders);
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

  // ── Auth ────────────────────────────────────────────────────────────────────

  const setRealUser = useCallback((userData, token) => {
    saveToken(token, userData);
    setCurrentUser(userData);
  }, []);

  const loginByRole = useCallback(async (role) => {
    // Authenticate with real backend credentials
    const credentials = role === ROLES.ADMIN
      ? { email: 'admin@spit.mess', password: 'admin123' }
      : { email: 'aryan@spit.edu', password: 'password123' };

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      let data = null;
      try {
        data = await res.json();
      } catch (parseErr) {
        // Non-JSON response
      }

      if (res.ok && data?.token) {
        const frontendRole = data.role === 'ROLE_ADMIN' ? ROLES.ADMIN : ROLES.STUDENT;
        const userObj = {
          id: data.userId,
          name: data.name,
          email: data.email,
          role: frontendRole,
          phone: data.phone || '',
          uid: data.uid || '',
        };
        saveToken(data.token, userObj);
        setCurrentUser(userObj);
        return { success: true };
      } else if (res.status === 401) {
        throw new Error(data?.error || 'Invalid email or password');
      } else if (res.status === 403) {
        throw new Error(data?.error || 'Access denied: account not permitted');
      } else {
        throw new Error(data?.error || `Login failed (HTTP status ${res.status})`);
      }
    } catch (err) {
      if (err.message && (err.message.includes('Invalid') || err.message.includes('Access denied') || err.message.includes('Login failed'))) {
        throw err;
      }
      throw new Error('Cannot reach the backend server. Please verify Spring Boot is running on port 8080.');
    }
  }, []);

  const logout = useCallback(() => {
    saveToken(null, null);
    setCurrentUser(null);
    setCart([]);
    setOrders([]);
    setAdminOverview(null);
  }, []);

  // ── Cart ─────────────────────────────────────────────────────────────────────

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      const currentQty = existing ? existing.qty : 0;
      const maxAvailable = item.qty != null ? item.qty : 50;
      if (currentQty >= maxAvailable) {
        return prev; // cannot exceed available stock
      }
      if (existing) {
        return prev.map(c => c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        category: item.category,
        emoji: item.emoji || '🍱',
      }];
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

  // ── Student Orders ──────────────────────────────────────────────────────────

  const placeOrder = useCallback(async (slotId, notes = '', payMethod = 'UPI', simulateFailure = false, idempotencyKey = null) => {
    if (!currentUser) return { error: 'Please sign in to place an order.' };
    if (cart.length === 0) return { error: 'Your cart is empty. Please add items.' };

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
            emoji: c.emoji || '🍱',
          })),
          total: savedOrder.totalAmount, // Trusted DB total calculated server-side
          slotId,
          slotLabel: slot.label,
          status: savedOrder.status,
          createdAt: savedOrder.orderTime,
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
  }, [currentUser, cart, slots, clearCart, fetchMeals]);

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
        saveToken(loadToken(), updatedUser);
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
      console.warn('Backend cancel failed, updating locally', e);
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        if (o.status === ORDER_STATUS.PREPARING || o.status === ORDER_STATUS.READY || o.status === ORDER_STATUS.COMPLETED) return o;
        return { ...o, status: ORDER_STATUS.CANCELLED };
      }));
      return { success: true };
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
          imageUrl: productData.imageUrl || productData.emoji || '🍱',
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
          imageUrl: productData.imageUrl || productData.emoji || '🍱',
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
      // Local fallback for offline/demo
      setOrders(prev => prev.map(o => (o.id === orderId || o.dbId === orderId) ? { ...o, status: targetStatus } : o));
      return { success: true };
    }
  }, [orders, fetchOrders, fetchMeals]);

  // ── Notifications ─────────────────────────────────────────────────────────────

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Derived values ────────────────────────────────────────────────────────────

  const myOrders = currentUser ? orders.filter(o => o.userId === currentUser.id) : [];
  const activeOrders = myOrders.filter(o => o.status !== ORDER_STATUS.COMPLETED && o.status !== ORDER_STATUS.CANCELLED);
  const availableSlots = slots.filter(s => s.active && s.booked < s.capacity);

  return (
    <AppContext.Provider value={{
      // Auth
      currentUser, loginByRole, logout, setRealUser,
      // Cart
      cart, addToCart, removeFromCart, clearCart, cartTotal, cartCount,
      // Orders
      orders, myOrders, activeOrders, orderFetchError,
      placeOrder, createCounterOrder, cancelOrder, updateOrderStatus,
      fetchOrders,
      // Profile
      updateProfile,
      // Menu
      menuItems,
      fetchMeals,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      toggleMenuItemAvailability,
      // Admin Overview
      adminOverview,
      // Slots
      slots, availableSlots,
      // Notifications
      notifications, unreadCount, markAllRead,
      // Subscriptions
      subscriptions,
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
