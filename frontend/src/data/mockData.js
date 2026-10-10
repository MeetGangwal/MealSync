// Mock data store for MealSync
// In production this would be replaced by API calls to Spring Boot backend

export const ROLES = {
  STUDENT: 'student',
  THALI_STAFF: 'thali_staff',
  DISHES_STAFF: 'dishes_staff',
  ADMIN: 'admin',
};

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PARTIALLY_SERVED: 'partially_served',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ITEM_CATEGORY = {
  THALI: 'thali',
  DISHES: 'dishes',
};

// ─── Users ──────────────────────────────────────────────────────────────────
export const USERS = [
  { id: 'u1', name: 'Aryan Dandekar', email: 'aryan@spit.edu', role: ROLES.STUDENT, uid: '2025510014', avatar: 'AD', phone: '+91 98765 43210' },
  { id: 'u2', name: 'Meet Gangwal', email: 'meet@spit.edu', role: ROLES.STUDENT, uid: '2025510018', avatar: 'MG', phone: '+91 98765 43211' },
  { id: 'u3', name: 'Priya Sharma', email: 'priya@spit.edu', role: ROLES.STUDENT, uid: '2025510020', avatar: 'PS', phone: '+91 98765 43212' },
  { id: 'u4', name: 'Ravi Thali', email: 'ravi.thali@spit.mess', role: ROLES.THALI_STAFF, avatar: 'RT', phone: '+91 98765 43213' },
  { id: 'u5', name: 'Suresh Dishes', email: 'suresh.dishes@spit.mess', role: ROLES.DISHES_STAFF, avatar: 'SD', phone: '+91 98765 43214' },
  { id: 'u6', name: 'Mess Admin', email: 'admin@spit.mess', role: ROLES.ADMIN, avatar: 'MA', phone: '+91 98765 43215' },
];

// ─── Menu Items ──────────────────────────────────────────────────────────────
export const MENU_ITEMS_INITIAL = [
  // Thali Counter
  { id: 'm1', name: 'Regular Thali', category: ITEM_CATEGORY.THALI, emoji: '🍱', price: 50, initialQty: 300, qty: 182, available: true, description: 'Dal, Sabji, Roti×3, Rice, Salad', counter: 'thali', rating: 4.2, popular: true },
  { id: 'm2', name: 'Special Thali', category: ITEM_CATEGORY.THALI, emoji: '🍛', price: 70, initialQty: 150, qty: 43, available: true, description: 'Dal Makhani, Paneer, Roti×4, Rice, Dessert, Salad', counter: 'thali', rating: 4.7, popular: true },
  // Dishes Counter
  { id: 'm3', name: 'Steamed Rice', category: ITEM_CATEGORY.DISHES, emoji: '🍚', price: 20, initialQty: 200, qty: 120, available: true, description: 'Fresh steamed basmati rice', counter: 'dishes', rating: 3.9, popular: false },
  { id: 'm4', name: 'Buttermilk', category: ITEM_CATEGORY.DISHES, emoji: '🥛', price: 15, initialQty: 150, qty: 82, available: true, description: 'Chilled spiced buttermilk', counter: 'dishes', rating: 4.4, popular: true },
  { id: 'm5', name: 'Veg Sandwich', category: ITEM_CATEGORY.DISHES, emoji: '🥪', price: 30, initialQty: 60, qty: 17, available: true, description: 'Grilled veg sandwich with chutney', counter: 'dishes', rating: 4.1, popular: false },
  { id: 'm6', name: 'Masala Noodles', category: ITEM_CATEGORY.DISHES, emoji: '🍜', price: 40, initialQty: 80, qty: 0, available: false, description: 'Spicy masala noodles with veggies', counter: 'dishes', rating: 4.0, popular: false },
  { id: 'm7', name: 'Curd Bowl', category: ITEM_CATEGORY.DISHES, emoji: '🥣', price: 20, initialQty: 100, qty: 64, available: true, description: 'Fresh homestyle curd', counter: 'dishes', rating: 4.3, popular: false },
  { id: 'm8', name: 'Gulab Jamun', category: ITEM_CATEGORY.DISHES, emoji: '🍮', price: 25, initialQty: 120, qty: 55, available: true, description: 'Warm gulab jamun (2 pcs)', counter: 'dishes', rating: 4.8, popular: true },
];

// ─── Pickup Slots ─────────────────────────────────────────────────────────────
export const PICKUP_SLOTS_INITIAL = [
  { id: 's1', label: '12:30 – 12:45', startTime: '12:30', endTime: '12:45', capacity: 50, booked: 38, meal: 'lunch', active: true },
  { id: 's2', label: '12:45 – 1:00', startTime: '12:45', endTime: '13:00', capacity: 50, booked: 42, meal: 'lunch', active: true },
  { id: 's3', label: '1:00 – 1:15', startTime: '13:00', endTime: '13:15', capacity: 50, booked: 50, meal: 'lunch', active: true },
  { id: 's4', label: '1:15 – 1:30', startTime: '13:15', endTime: '13:30', capacity: 50, booked: 27, meal: 'lunch', active: true },
  { id: 's5', label: '7:30 – 7:45', startTime: '07:30', endTime: '07:45', capacity: 40, booked: 18, meal: 'breakfast', active: true },
  { id: 's6', label: '7:45 – 8:00', startTime: '07:45', endTime: '08:00', capacity: 40, booked: 32, meal: 'breakfast', active: true },
  { id: 's7', label: '7:30 – 7:45 PM', startTime: '19:30', endTime: '19:45', capacity: 50, booked: 22, meal: 'dinner', active: true },
  { id: 's8', label: '7:45 – 8:00 PM', startTime: '19:45', endTime: '20:00', capacity: 50, booked: 35, meal: 'dinner', active: true },
];

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ORDERS_INITIAL = [
  {
    id: 'MS10284',
    userId: 'u1',
    studentName: 'Aryan Dandekar',
    studentUID: '2025510014',
    items: [
      { menuItemId: 'm2', name: 'Special Thali', qty: 1, price: 70, counter: 'thali' },
      { menuItemId: 'm4', name: 'Buttermilk', qty: 1, price: 15, counter: 'dishes' },
    ],
    total: 85,
    slotId: 's3',
    slotLabel: '1:00 – 1:15',
    status: ORDER_STATUS.READY,
    thaliStatus: 'ready',
    dishesStatus: 'ready',
    createdAt: '2026-10-06T12:31:00Z',
    meal: 'lunch',
    paymentConfirmed: true,
    paymentMethod: 'UPI',
    qrVerified: false,
    qrScannedAt: null,
    notes: '',
  },
  {
    id: 'MS10285',
    userId: 'u2',
    studentName: 'Meet Gangwal',
    studentUID: '2025510018',
    items: [
      { menuItemId: 'm1', name: 'Regular Thali', qty: 1, price: 50, counter: 'thali' },
      { menuItemId: 'm3', name: 'Steamed Rice', qty: 1, price: 20, counter: 'dishes' },
      { menuItemId: 'm4', name: 'Buttermilk', qty: 1, price: 15, counter: 'dishes' },
    ],
    total: 85,
    slotId: 's3',
    slotLabel: '1:00 – 1:15',
    status: ORDER_STATUS.PREPARING,
    thaliStatus: 'preparing',
    dishesStatus: 'ready',
    createdAt: '2026-10-06T12:32:00Z',
    meal: 'lunch',
    paymentConfirmed: true,
    paymentMethod: 'UPI',
    qrVerified: false,
    qrScannedAt: null,
    notes: 'Less spicy please',
  },
  {
    id: 'MS10283',
    userId: 'u1',
    studentName: 'Aryan Dandekar',
    studentUID: '2025510014',
    items: [
      { menuItemId: 'm1', name: 'Regular Thali', qty: 1, price: 50, counter: 'thali' },
    ],
    total: 50,
    slotId: 's2',
    slotLabel: '12:45 – 1:00',
    status: ORDER_STATUS.COMPLETED,
    thaliStatus: 'served',
    dishesStatus: 'na',
    createdAt: '2026-10-05T12:25:00Z',
    meal: 'lunch',
    paymentConfirmed: true,
    paymentMethod: 'UPI',
    qrVerified: true,
    qrScannedAt: '2026-10-05T12:48:00Z',
    rating: { food: 4, taste: 5, quantity: 4, service: 4 },
  },
  {
    id: 'MS10282',
    userId: 'u3',
    studentName: 'Priya Sharma',
    studentUID: '2025510020',
    items: [
      { menuItemId: 'm2', name: 'Special Thali', qty: 1, price: 70, counter: 'thali' },
      { menuItemId: 'm8', name: 'Gulab Jamun', qty: 1, price: 25, counter: 'dishes' },
    ],
    total: 95,
    slotId: 's3',
    slotLabel: '1:00 – 1:15',
    status: ORDER_STATUS.CONFIRMED,
    thaliStatus: 'preparing',
    dishesStatus: 'preparing',
    createdAt: '2026-10-06T12:29:00Z',
    meal: 'lunch',
    paymentConfirmed: true,
    paymentMethod: 'UPI',
    qrVerified: false,
    qrScannedAt: null,
  },
  {
    id: 'MS10280',
    userId: 'u2',
    studentName: 'Meet Gangwal',
    studentUID: '2025510018',
    items: [
      { menuItemId: 'm1', name: 'Regular Thali', qty: 1, price: 50, counter: 'thali' },
      { menuItemId: 'm7', name: 'Curd Bowl', qty: 1, price: 20, counter: 'dishes' },
    ],
    total: 70,
    slotId: 's1',
    slotLabel: '12:30 – 12:45',
    status: ORDER_STATUS.COMPLETED,
    thaliStatus: 'served',
    dishesStatus: 'served',
    createdAt: '2026-10-05T12:10:00Z',
    meal: 'lunch',
    paymentConfirmed: true,
    paymentMethod: 'UPI',
    qrVerified: true,
    qrScannedAt: '2026-10-05T12:33:00Z',
    rating: { food: 5, taste: 4, quantity: 5, service: 3 },
  },
];

// ─── Analytics ────────────────────────────────────────────────────────────────
export const ANALYTICS_DATA = {
  todayOrders: 842,
  todayCompleted: 721,
  todayPending: 91,
  todayCancelled: 30,
  todayRevenue: 42350,
  weekRevenue: [28400, 31200, 35100, 42350, 38700, 29100, 0],
  monthlyRevenue: 4,
  avgPickupTime: 6.4,
  cancellationRate: 3.2,
  ordersByHour: [
    { hour: '7AM', orders: 42 },
    { hour: '8AM', orders: 78 },
    { hour: '9AM', orders: 23 },
    { hour: '10AM', orders: 11 },
    { hour: '11AM', orders: 65 },
    { hour: '12PM', orders: 198 },
    { hour: '1PM', orders: 287 },
    { hour: '2PM', orders: 94 },
    { hour: '3PM', orders: 18 },
    { hour: '7PM', orders: 156 },
    { hour: '8PM', orders: 82 },
  ],
  topItems: [
    { name: 'Regular Thali', orders: 387, revenue: 19350 },
    { name: 'Special Thali', orders: 214, revenue: 14980 },
    { name: 'Buttermilk', orders: 193, revenue: 2895 },
    { name: 'Steamed Rice', orders: 145, revenue: 2900 },
    { name: 'Gulab Jamun', orders: 112, revenue: 2800 },
    { name: 'Curd Bowl', orders: 98, revenue: 1960 },
  ],
  wastage: [
    { day: 'Mon', prepared: 480, ordered: 435, collected: 420 },
    { day: 'Tue', prepared: 510, ordered: 478, collected: 461 },
    { day: 'Wed', prepared: 460, ordered: 445, collected: 432 },
    { day: 'Thu', prepared: 520, ordered: 498, collected: 476 },
    { day: 'Fri', prepared: 550, ordered: 512, collected: 488 },
    { day: 'Sat', prepared: 390, ordered: 358, collected: 340 },
    { day: 'Sun', prepared: 430, ordered: 405, collected: 389 },
  ],
  feedback: { food: 4.2, taste: 4.5, quantity: 4.3, service: 3.9 },
  upcomingDemand: {
    '12:30-12:45': { 'Regular Thali': 38, 'Special Thali': 17, Buttermilk: 29, Rice: 12 },
    '12:45-1:00': { 'Regular Thali': 42, 'Special Thali': 22, Buttermilk: 34, Rice: 18 },
    '1:00-1:15': { 'Regular Thali': 61, 'Special Thali': 32, Buttermilk: 44, Rice: 23 },
    '1:15-1:30': { 'Regular Thali': 29, 'Special Thali': 15, Buttermilk: 21, Rice: 10 },
  },
  forecastTomorrow: [
    { item: 'Regular Thali', predicted: 430, confidence: 87 },
    { item: 'Special Thali', predicted: 160, confidence: 82 },
    { item: 'Buttermilk', predicted: 240, confidence: 91 },
    { item: 'Steamed Rice', predicted: 130, confidence: 85 },
    { item: 'Gulab Jamun', predicted: 115, confidence: 78 },
  ],
  infraMetrics: {
    cpuUsage: 62,
    memoryUsage: 57,
    backendPods: 3,
    activePods: 3,
    requestsPerMin: 38,
    apiLatency: 82,
    errorRate: 0.4,
    activeUsers: 426,
    thaliOrders: 21,
    dishOrders: 17,
    qrVerificationsHr: 142,
  },
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const NOTIFICATIONS_INITIAL = [
  { id: 'n1', title: 'Order Ready!', message: 'Your order MS10284 is ready for pickup at Counter.', type: 'success', time: '5 min ago', read: false },
  { id: 'n2', title: 'Lunch Ordering Open', message: 'Today\'s lunch menu is now available. Order before 12:15 PM.', type: 'info', time: '32 min ago', read: false },
  { id: 'n3', title: 'Special Thali Running Low', message: 'Only 20 Special Thali portions remaining!', type: 'warning', time: '1 hr ago', read: true },
  { id: 'n4', title: 'Payment Confirmed', message: 'Payment of ₹85 confirmed for order MS10283.', type: 'success', time: '2 days ago', read: true },
];

// ─── Subscription Plans ───────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = [
  { id: 'plan1', name: 'Monthly Lunch', price: 1200, meals: 'lunch', days: 'Mon–Fri', totalMeals: 22, used: 7, skipped: 2, status: 'active' },
  { id: 'plan2', name: 'Monthly Dinner', price: 1400, meals: 'dinner', days: 'Mon–Fri', totalMeals: 22, used: 0, skipped: 0, status: 'inactive' },
];
