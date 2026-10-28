import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  ShoppingCart, TrendingUp, Users, AlertTriangle, Package, Clock,
  DollarSign, Cpu, Activity, Zap, CheckCircle, XCircle, BarChart3,
  Edit, Trash2, Plus, Eye, Settings, Search, Minus, Check,
  Store, CreditCard, Receipt, Printer, RefreshCw, X, ShieldCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { StatCard, SectionHeader, StatusBadge, ProgressBar, AlertBanner, EmptyState } from '../components/Shared';
import { ANALYTICS_DATA, ORDER_STATUS, ITEM_CATEGORY } from '../data/mockData';

// ─── Admin Dashboard ──────────────────────────────────────
export function AdminDashboard({ setPage }) {
  const { orders, menuItems, adminOverview } = useApp();
  const a = ANALYTICS_DATA;

  const totalOrders = adminOverview?.totalOrders ?? orders.length;
  const todayOrders = adminOverview?.todayOrders ?? orders.length;
  const revenue = adminOverview?.todaySales ?? a.todayRevenue;
  const pending = adminOverview?.pendingOrders ?? orders.filter(o => o.status === ORDER_STATUS.PREPARING || o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.READY).length;
  const availableCount = adminOverview?.availableProducts ?? menuItems.filter(m => m.available && m.qty > 0).length;
  const soldOutCount = adminOverview?.soldOutProducts ?? menuItems.filter(m => !m.available || m.qty === 0).length;

  const COLORS = ['#6C63FF', '#43E97B', '#F7971E', '#00C6FB', '#FF6584', '#FFD200'];

  return (
    <div>
      <SectionHeader
        title="Mess Operations Dashboard"
        subtitle="Operations overview — Unified Single Campus Food Counter"
        actions={
          <div className="flex gap-sm items-center">
            <div className="flex items-center gap-xs">
              <div className="status-dot online pulse" />
              <span className="body-sm text-success">Live Kitchen Sync</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setPage('menu-mgmt')}>
              Manage Menu ({menuItems.length})
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage('admin-orders')}>
              All Orders ({orders.length})
            </button>
          </div>
        }
      />

      {/* ── Key Metrics ───────────────────────────────── */}
      <div className="grid grid-4 gap-md mb-xl">
        <StatCard label="Today's Orders" value={todayOrders} icon={ShoppingCart} variant="primary" />
        <StatCard label="Today's Revenue" value={`₹${Math.round(revenue).toLocaleString()}`} icon={TrendingUp} variant="success" />
        <StatCard label="Active / Pending" value={pending} icon={Clock} variant="warning" />
        <StatCard label="Available / Sold Out" value={`${availableCount} / ${soldOutCount}`} icon={Package} variant="info" />
      </div>

      <div className="grid grid-2 gap-lg mb-lg">
        {/* Orders by Hour */}
        <div className="chart-container">
          <div className="chart-title">
            Orders by Hour
            <span className="badge badge-success">Today</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={a.ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="orders" fill="url(#colorBars)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="colorBars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6C63FF" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Items */}
        <div className="chart-container">
          <div className="chart-title">Popular Items</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={a.topItems.slice(0, 5)} dataKey="orders" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {a.topItems.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-2 gap-lg mb-lg">
        {/* Weekly Revenue */}
        <div className="chart-container">
          <div className="chart-title">Weekly Revenue</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({ day: d, revenue: a.weekRevenue[i] }))}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)' }} formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#6C63FF" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Feedback Ratings */}
        <div className="chart-container">
          <div className="chart-title">Weekly Feedback</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingTop: 12 }}>
            {Object.entries(a.feedback).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between mb-xs">
                  <span className="label" style={{ textTransform: 'capitalize' }}>{key}</span>
                  <span className="heading-sm text-warning">{val}/5 ⭐</span>
                </div>
                <ProgressBar value={val} max={5} variant={val >= 4 ? 'success' : val >= 3 ? 'warning' : 'danger'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Demand */}
      <div className="card mb-lg">
        <div className="chart-title mb-md">
          Upcoming Pickup Demand
          <span className="badge badge-warning">Live Forecast</span>
        </div>
        <div className="grid grid-4 gap-md">
          {Object.entries(a.upcomingDemand).map(([slot, items]) => (
            <div key={slot} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
              <div className="heading-sm mb-sm">📍 {slot}</div>
              {Object.entries(items).map(([item, qty]) => (
                <div key={item} className="flex justify-between caption" style={{ padding: '2px 0' }}>
                  <span className="text-secondary">{item}</span>
                  <span className="text-brand font-bold">{qty}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders table */}
      <div className="card">
        <div className="chart-title mb-md">Recent Orders <button className="btn btn-ghost btn-sm" onClick={() => setPage('admin-orders')}>View All</button></div>
        <div className="table-container">
          <table>
            <thead><tr>
              <th>Order ID</th><th>Student</th><th>Items</th><th>Total</th><th>Slot</th><th>Status</th>
            </tr></thead>
            <tbody>
              {orders.slice(0, 6).map(o => (
                <tr key={o.id}>
                  <td style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{o.id}</td>
                  <td>{o.studentName}</td>
                  <td>{o.items.map(i => i.name).join(', ')}</td>
                  <td>₹{o.total}</td>
                  <td>{o.slotLabel}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Menu Management ──────────────────────────────────────
export function MenuManagement() {
  const { menuItems, updateMenuItem, addMenuItem, deleteMenuItem, toggleMenuItemAvailability } = useApp();
  const [editModal, setEditModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [feedback, setFeedback] = useState({ type: '', msg: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const openEdit = (item) => {
    setForm({
      name: item.name,
      description: item.description,
      category: item.category || 'meals',
      price: item.price,
      availableQuantity: item.qty != null ? item.qty : 50,
      isAvailable: item.available !== false,
      emoji: item.emoji || '🍽️',
    });
    setEditModal(item.id);
    setFeedback({ type: '', msg: '' });
  };

  const saveEdit = async () => {
    if (!form.name?.trim() || !form.price || form.price <= 0) {
      setFeedback({ type: 'danger', msg: 'Please provide a valid product name and positive price.' });
      return;
    }
    setActionLoading(true);
    const res = await updateMenuItem(editModal, form);
    setActionLoading(false);
    if (res?.success) {
      setEditModal(null);
      setFeedback({ type: 'success', msg: `Updated ${form.name} successfully!` });
    } else {
      setFeedback({ type: 'danger', msg: res?.error || 'Failed to update item.' });
    }
  };

  const openAdd = () => {
    setForm({
      name: '',
      category: 'thali',
      emoji: '🍱',
      price: 50,
      availableQuantity: 50,
      description: '',
      isAvailable: true,
    });
    setAddModal(true);
    setFeedback({ type: '', msg: '' });
  };

  const saveAdd = async () => {
    if (!form.name?.trim() || !form.price || form.price <= 0) {
      setFeedback({ type: 'danger', msg: 'Please provide a valid product name and positive price.' });
      return;
    }
    setActionLoading(true);
    const res = await addMenuItem(form);
    setActionLoading(false);
    if (res?.success) {
      setAddModal(false);
      setFeedback({ type: 'success', msg: `Added ${form.name} to catalogue!` });
    } else {
      setFeedback({ type: 'danger', msg: res?.error || 'Failed to add item.' });
    }
  };

  const handleDeactivate = async (id, name) => {
    if (window.confirm(`Are you sure you want to deactivate "${name}"? It will be marked sold-out on the student menu.`)) {
      setActionLoading(true);
      const res = await deleteMenuItem(id);
      setActionLoading(false);
      if (res?.success) {
        setFeedback({ type: 'success', msg: `Deactivated "${name}" safely.` });
      } else {
        setFeedback({ type: 'danger', msg: res?.error || 'Failed to deactivate item.' });
      }
    }
  };

  const handleToggle = async (id) => {
    await toggleMenuItemAvailability(id);
  };

  const filteredItems = menuItems.filter(item => {
    const matchCat = filterCat === 'all' || item.category === filterCat;
    const matchSearch = !searchTerm.trim() ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div>
      <SectionHeader
        title="Product Catalogue Management"
        subtitle="Manage food items, pricing, inventory stock, and availability for the single campus counter"
        actions={
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add New Product
          </button>
        }
      />

      {feedback.msg && (
        <div className={`alert alert-${feedback.type} mb-md`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{feedback.msg}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setFeedback({ type: '', msg: '' })}>✕</button>
        </div>
      )}

      {/* Search and Category Filter Toolbar */}
      <div className="flex gap-md mb-lg flex-wrap items-center">
        <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
          <Search size={16} className="search-icon" />
          <input
            placeholder="Search items by name or description…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="tab-list">
          {[
            { key: 'all', label: 'All Items' },
            { key: 'thali', label: '🍱 Thalis' },
            { key: 'snacks', label: '🍔 Snacks' },
            { key: 'south-indian', label: '🥞 South Indian' },
            { key: 'meals', label: '🍛 Meals & Bowls' },
            { key: 'beverages', label: '🥤 Drinks' },
          ].map(c => (
            <div
              key={c.key}
              className={`tab-item ${filterCat === c.key ? 'active' : ''}`}
              onClick={() => setFilterCat(c.key)}
            >
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Live Toggle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id}>
                <td>
                  <div className="flex items-center gap-sm">
                    <span style={{ fontSize: '1.75rem' }}>{item.emoji}</span>
                    <div>
                      <div className="label">{item.name}</div>
                      <div className="caption text-muted">{item.description ? item.description.slice(0, 50) + '…' : ''}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>
                    {item.category?.replace('-', ' ')}
                  </span>
                </td>
                <td className="heading-sm text-brand">₹{item.price}</td>
                <td>
                  <div className="caption font-bold" style={{ color: item.qty === 0 ? 'var(--color-danger)' : item.qty < 20 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    {item.qty} portions
                  </div>
                  <ProgressBar
                    value={item.qty}
                    max={item.initialQty || 100}
                    variant={item.qty === 0 ? 'danger' : item.qty < 20 ? 'warning' : 'success'}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-sm">
                    <div className={`status-dot ${item.available && item.qty > 0 ? 'online' : 'offline'}`} />
                    <span className="body-sm">{item.available && item.qty > 0 ? 'Available' : 'Sold Out'}</span>
                  </div>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleToggle(item.id)}
                    title="Toggle student menu visibility"
                    style={{ fontSize: '0.75rem' }}
                  >
                    {item.available ? '🟢 Visible' : '⚪ Hidden'}
                  </button>
                </td>
                <td>
                  <div className="flex gap-xs">
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(item)} title="Edit item">
                      <Edit size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => handleDeactivate(item.id, item.name)}
                      style={{ color: 'var(--color-danger)' }}
                      title="Deactivate item (preserves order history)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-lg">Edit Product</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditModal(null)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <MenuItemForm form={form} setForm={setForm} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)} disabled={actionLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={actionLoading}>
                {actionLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-lg">Add New Product</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAddModal(false)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <MenuItemForm form={form} setForm={setForm} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAddModal(false)} disabled={actionLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAdd} disabled={actionLoading}>
                {actionLoading ? 'Adding…' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItemForm({ form, setForm }) {
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="grid grid-2 gap-md">
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input className="form-input" placeholder="e.g. Masala Dosa" value={form.name || ''} onChange={e => f('name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Food Emoji / Icon</label>
          <input className="form-input" placeholder="e.g. 🍱, 🍛, 🥞" value={form.emoji || ''} onChange={e => f('emoji', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-2 gap-md">
        <div className="form-group">
          <label className="form-label">Price (₹) *</label>
          <input className="form-input" type="number" min="1" step="1" value={form.price || ''} onChange={e => f('price', +e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Available Stock Portions *</label>
          <input className="form-input" type="number" min="0" value={form.availableQuantity ?? form.qty ?? 50} onChange={e => f('availableQuantity', +e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-2 gap-md">
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-input form-select" value={form.category || 'meals'} onChange={e => f('category', e.target.value)}>
            <option value="thali">🍱 Thalis & Combos</option>
            <option value="snacks">🍔 Snacks & Quick Bites</option>
            <option value="south-indian">🥞 South Indian & Breakfast</option>
            <option value="meals">🍛 Rice Bowls & Curries</option>
            <option value="beverages">🥤 Beverages & Refreshers</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Student Menu Status</label>
          <select className="form-input form-select" value={form.isAvailable ? 'true' : 'false'} onChange={e => f('isAvailable', e.target.value === 'true')}>
            <option value="true">🟢 Available (Visible on live menu)</option>
            <option value="false">🔴 Sold Out / Hidden</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Short Description</label>
        <textarea
          className="form-input form-textarea"
          style={{ minHeight: 65 }}
          placeholder="Ingredients, accompaniments (e.g. 2 Roti, Dal, Rice, Salad)..."
          value={form.description || ''}
          onChange={e => f('description', e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Analytics Page ───────────────────────────────────────
export function AnalyticsPage() {
  const a = ANALYTICS_DATA;
  const COLORS = ['#6C63FF', '#43E97B', '#F7971E', '#00C6FB', '#FF6584'];

  return (
    <div>
      <SectionHeader title="Analytics" subtitle="Deep dive into mess performance data" />

      <div className="grid grid-4 mb-xl">
        <StatCard label="Total Orders" value={a.todayOrders} icon={ShoppingCart} variant="primary" trend={12} />
        <StatCard label="Revenue Today" value={`₹${a.todayRevenue.toLocaleString()}`} icon={TrendingUp} variant="success" trend={8} />
        <StatCard label="Avg Pickup Time" value={`${a.avgPickupTime}min`} icon={Clock} variant="warning" />
        <StatCard label="Cancellation Rate" value={`${a.cancellationRate}%`} icon={AlertTriangle} variant="danger" />
      </div>

      <div className="grid grid-2 gap-lg mb-lg">
        <div className="chart-container">
          <div className="chart-title">Orders by Hour</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={a.ordersByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Bar dataKey="orders" fill="#6C63FF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <div className="chart-title">Top Items by Orders</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
            {a.topItems.map((item, i) => (
              <div key={item.name}>
                <div className="flex justify-between mb-xs">
                  <span className="label">#{i + 1} {item.name}</span>
                  <span className="label">{item.orders} orders · ₹{item.revenue.toLocaleString()}</span>
                </div>
                <ProgressBar value={item.orders} max={a.topItems[0].orders} variant="primary" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="chart-container mb-lg">
        <div className="chart-title">Weekly Revenue Trend</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => ({ day: d, revenue: a.weekRevenue[i] }))}>
            <defs>
              <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#43E97B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#43E97B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)' }} formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} />
            <Area type="monotone" dataKey="revenue" stroke="#43E97B" fill="url(#rev2)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Cloud Monitoring ─────────────────────────────────────
export function CloudMonitoring() {
  const m = ANALYTICS_DATA.infraMetrics;
  const [autoRefresh, setAutoRefresh] = useState(false);

  return (
    <div>
      <SectionHeader
        title="Cloud Monitoring"
        subtitle="Prometheus + Grafana · Kubernetes · AWS EC2"
        actions={
          <div className="flex gap-sm items-center">
            <span className="badge badge-success badge-dot">All Systems Operational</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAutoRefresh(v => !v)}>
              <Activity size={14} /> {autoRefresh ? 'Stop' : 'Auto Refresh'}
            </button>
          </div>
        }
      />

      <AlertBanner type="success" message="✅ All Prometheus targets are UP · Grafana dashboards operational · HPA active · 3 backend pods running" />

      {/* Infrastructure Metrics */}
      <div className="grid grid-4 mb-xl mt-lg">
        <StatCard label="CPU Usage" value={`${m.cpuUsage}%`} icon={Cpu} variant={m.cpuUsage > 80 ? 'danger' : m.cpuUsage > 60 ? 'warning' : 'success'} sub="node_cpu_seconds_total" />
        <StatCard label="Memory" value={`${m.memoryUsage}%`} icon={Activity} variant="primary" sub="node_memory_MemUsed" />
        <StatCard label="Backend Pods" value={m.backendPods} icon={Zap} variant="success" sub="HPA auto-scaled" />
        <StatCard label="Active Users" value={m.activeUsers} icon={Users} variant="info" sub="Live connections" />
      </div>

      <div className="grid grid-4 mb-xl">
        <StatCard label="Requests/min" value={m.requestsPerMin} icon={TrendingUp} variant="primary" />
        <StatCard label="API Latency" value={`${m.apiLatency}ms`} icon={Clock} variant={m.apiLatency > 200 ? 'danger' : 'success'} sub="p95" />
        <StatCard label="Error Rate" value={`${m.errorRate}%`} icon={AlertTriangle} variant={m.errorRate > 1 ? 'danger' : 'success'} />
        <StatCard label="QR Verifications/hr" value={m.qrVerificationsHr} icon={CheckCircle} variant="info" />
      </div>

      {/* Grafana Dashboards Panel */}
      <div className="grid grid-2 gap-lg mb-lg">
        {/* Infra Overview Dashboard */}
        <div className="card">
          <div className="chart-title mb-md">
            📊 Infrastructure Overview
            <span className="badge badge-primary">Grafana D1</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {[
              { label: 'CPU Utilisation', value: m.cpuUsage, max: 100, variant: m.cpuUsage > 80 ? 'danger' : 'warning', query: 'avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100' },
              { label: 'Memory Used', value: m.memoryUsage, max: 100, variant: 'primary', query: 'node_memory_MemUsed_bytes / node_memory_MemTotal_bytes' },
              { label: 'Disk Usage', value: 34, max: 100, variant: 'success', query: 'node_filesystem_avail_bytes / node_filesystem_size_bytes' },
            ].map(({ label, value, max, variant, query }) => (
              <div key={label}>
                <div className="flex justify-between mb-xs">
                  <span className="label">{label}</span>
                  <span className="caption text-muted">{value}%</span>
                </div>
                <ProgressBar value={value} max={max} variant={variant} />
                <div className="caption text-muted" style={{ marginTop: 4, fontFamily: 'monospace', fontSize: '0.7rem' }}>{query}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Operations Dashboard */}
        <div className="card">
          <div className="chart-title mb-md">
            🍽️ MealSync Operations
            <span className="badge badge-info">Grafana D2</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {[
              { label: 'Orders / minute', value: m.requestsPerMin, unit: 'rps', color: 'var(--brand-primary)', query: 'sum(rate(http_server_requests_seconds_count[1m]))' },
              { label: 'API Latency p95', value: `${m.apiLatency}ms`, unit: '', color: 'var(--color-info)', query: 'histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket[1m])) by (le))' },
              { label: 'Error Rate', value: `${m.errorRate}%`, unit: '', color: m.errorRate > 1 ? 'var(--color-danger)' : 'var(--color-success)', query: 'rate(http_server_requests_seconds_count{status="5xx"}[1m])' },
              { label: 'Thali Orders (live)', value: m.thaliOrders, unit: '/min', color: 'var(--brand-secondary)', query: 'mealsync_thali_orders_total{counter="thali"}' },
              { label: 'Dish Orders (live)', value: m.dishOrders, unit: '/min', color: 'var(--color-success)', query: 'mealsync_dish_orders_total{counter="dishes"}' },
            ].map(({ label, value, unit, color, query }) => (
              <div key={label} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div className="label">{label}</div>
                  <div className="caption text-muted" style={{ fontFamily: 'monospace', fontSize: '0.65rem', marginTop: 2 }}>{query}</div>
                </div>
                <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>{value}{unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Kubernetes Status */}
      <div className="card mb-lg">
        <div className="chart-title mb-md">☸️ Kubernetes Cluster Status</div>
        <div className="grid grid-3 gap-md">
          {[
            { name: 'mealsync-backend', replicas: 3, cpu: '45%', mem: '312Mi', status: 'Running' },
            { name: 'mealsync-frontend', replicas: 2, cpu: '12%', mem: '128Mi', status: 'Running' },
            { name: 'postgres-db', replicas: 1, cpu: '18%', mem: '512Mi', status: 'Running' },
            { name: 'prometheus', replicas: 1, cpu: '8%', mem: '256Mi', status: 'Running' },
            { name: 'grafana', replicas: 1, cpu: '5%', mem: '128Mi', status: 'Running' },
            { name: 'nginx-ingress', replicas: 2, cpu: '6%', mem: '64Mi', status: 'Running' },
          ].map(pod => (
            <div key={pod.name} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex justify-between items-start mb-sm">
                <div className="label truncate" style={{ maxWidth: '70%' }}>{pod.name}</div>
                <span className="badge badge-success badge-dot" style={{ fontSize: '0.65rem' }}>{pod.status}</span>
              </div>
              <div className="flex gap-md">
                <div className="caption text-muted">Replicas: <span className="text-primary">{pod.replicas}</span></div>
                <div className="caption text-muted">CPU: <span className="text-primary">{pod.cpu}</span></div>
                <div className="caption text-muted">Mem: <span className="text-primary">{pod.mem}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure Stack */}
      <div className="grid grid-2 gap-lg">
        <div className="card">
          <div className="chart-title mb-md">🏗️ Terraform Infrastructure</div>
          {[
            { resource: 'aws_vpc.mealsync_vpc', status: 'active', id: 'vpc-0a1b2c3d' },
            { resource: 'aws_security_group.app_sg', status: 'active', id: 'sg-0x1y2z3w' },
            { resource: 'aws_instance.app_server', status: 'running', id: 'i-0123abc456' },
            { resource: 'aws_db_instance.postgres', status: 'available', id: 'db-mealsync-prod' },
          ].map(r => (
            <div key={r.resource} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div className="label" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.resource}</div>
                <div className="caption text-muted">{r.id}</div>
              </div>
              <span className="badge badge-success badge-dot">{r.status}</span>
            </div>
          ))}
          <div className="caption text-muted" style={{ marginTop: 12 }}>Last applied: terraform apply ✅</div>
        </div>

        <div className="card">
          <div className="chart-title mb-md">🤖 Ansible Automation</div>
          {[
            { task: 'Install Docker', status: 'ok', time: '12s' },
            { task: 'Configure K8s (k3s)', status: 'ok', time: '45s' },
            { task: 'Deploy Prometheus', status: 'ok', time: '8s' },
            { task: 'Deploy Grafana', status: 'ok', time: '6s' },
            { task: 'Configure Node Exporter', status: 'ok', time: '4s' },
            { task: 'Configure cAdvisor', status: 'ok', time: '5s' },
          ].map(t => (
            <div key={t.task} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-sm">
                <CheckCircle size={14} color="var(--color-success)" />
                <span className="label">{t.task}</span>
              </div>
              <span className="caption text-muted">{t.time}</span>
            </div>
          ))}
          <div className="caption text-muted" style={{ marginTop: 12 }}>ansible-playbook deploy.yml ✅</div>
        </div>
      </div>
    </div>
  );
}

// ─── Demand Forecasting ───────────────────────────────────
export function DemandForecast() {
  const a = ANALYTICS_DATA;
  return (
    <div>
      <SectionHeader title="Demand Forecasting" subtitle="AI-powered prediction based on historical patterns, day of week, and trends" />
      <AlertBanner type="info" message="📈 Tomorrow's forecast based on 4-week rolling average, weekday patterns, and current subscription data." />
      <div className="grid grid-2 gap-lg mt-lg">
        <div className="card">
          <h3 className="heading-lg mb-md">Tomorrow's Predicted Demand</h3>
          {a.forecastTomorrow.map(f => (
            <div key={f.item} className="mb-md">
              <div className="flex justify-between mb-xs">
                <span className="label">{f.item}</span>
                <div className="flex gap-sm items-center">
                  <span className="heading-sm text-brand">~{f.predicted}</span>
                  <span className={`badge ${f.confidence > 85 ? 'badge-success' : f.confidence > 75 ? 'badge-warning' : 'badge-danger'}`}>{f.confidence}% confidence</span>
                </div>
              </div>
              <ProgressBar value={f.confidence} max={100} variant={f.confidence > 85 ? 'success' : f.confidence > 75 ? 'warning' : 'danger'} />
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="heading-lg mb-md">Preparation Recommendations</h3>
          {a.forecastTomorrow.map(f => (
            <div key={f.item} className="flex justify-between items-center" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span className="label">{f.item}</span>
              <div className="flex gap-sm">
                <span className="badge badge-primary">Order: {Math.round(f.predicted * 0.95)}</span>
                <span className="badge badge-warning">Prepare: {Math.round(f.predicted * 1.1)}</span>
              </div>
            </div>
          ))}
          <div className="alert alert-success mt-md">
            <CheckCircle size={16} />
            <span>Preparing 10% extra buffer reduces stockout risk by 94%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Counter Sale / Walk-in Orders (Priority 3) ────────────
export function CounterSalePage({ setPage }) {
  const { menuItems, createCounterOrder, currentUser, authHeaders } = useApp();
  const [counterCart, setCounterCart] = useState([]);
  const [customerType, setCustomerType] = useState('guest'); // 'guest' | 'registered'
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashCollected, setCashCollected] = useState(true);
  const [pickupSlot, setPickupSlot] = useState('Instant Counter Pickup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', msg: '' });
  const [receiptOrder, setReceiptOrder] = useState(null);

  const [filterCat, setFilterCat] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Search registered users
  const handleUserSearch = async (q) => {
    setUserSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingUser(true);
    try {
      const res = await fetch(`/api/admin/customers/search?query=${encodeURIComponent(q.trim())}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Failed to search customers', err);
    } finally {
      setIsSearchingUser(false);
    }
  };

  const selectCustomer = (u) => {
    setSelectedUser(u);
    setCustomerName(u.name);
    setCustomerPhone(u.phone || '');
    setSearchResults([]);
    setUserSearchQuery(`${u.name} (${u.email})`);
  };

  const switchGuest = () => {
    setCustomerType('guest');
    setSelectedUser(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setUserSearchQuery('');
    setSearchResults([]);
  };

  // Cart operations
  const addToCounterCart = (item) => {
    setFeedback({ type: '', msg: '' });
    setCounterCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id);
      if (existing) {
        if (existing.qty >= item.qty) {
          setFeedback({ type: 'danger', msg: `Only ${item.qty} portions of "${item.name}" available in stock.` });
          return prev;
        }
        return prev.map(i => i.menuItemId === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji || '🍽️',
        qty: 1,
        maxQty: item.qty,
      }];
    });
  };

  const updateQty = (menuItemId, delta) => {
    setFeedback({ type: '', msg: '' });
    setCounterCart(prev => prev.map(i => {
      if (i.menuItemId === menuItemId) {
        const newQty = i.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > i.maxQty) {
          setFeedback({ type: 'danger', msg: `Cannot exceed available stock of ${i.maxQty}.` });
          return i;
        }
        return { ...i, qty: newQty };
      }
      return i;
    }).filter(Boolean));
  };

  const removeFromCounterCart = (menuItemId) => {
    setCounterCart(prev => prev.filter(i => i.menuItemId !== menuItemId));
  };

  const cartTotal = useMemo(() => {
    return counterCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [counterCart]);

  const handleCheckoutCounter = async () => {
    if (counterCart.length === 0) {
      setFeedback({ type: 'danger', msg: 'Counter cart is empty. Add at least one item.' });
      return;
    }
    if (!customerName.trim()) {
      setFeedback({ type: 'danger', msg: 'Please provide a customer name or leave as Walk-in Customer.' });
      return;
    }

    const isPaid = paymentMethod === 'CASH' ? cashCollected : true;

    const payload = {
      userId: selectedUser ? selectedUser.id : null,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      customerEmail: selectedUser ? selectedUser.email : null,
      paymentMethod,
      cashCollected: isPaid,
      pickupSlot,
      items: counterCart.map(c => ({
        menuItemId: c.menuItemId,
        qty: c.qty,
      })),
    };

    setIsSubmitting(true);
    setFeedback({ type: '', msg: '' });
    const result = await createCounterOrder(payload);
    setIsSubmitting(false);

    if (result.success && result.order) {
      setReceiptOrder(result.order);
      setCounterCart([]);
      if (customerType === 'guest') {
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
      }
    } else {
      setFeedback({ type: 'danger', msg: result.error || 'Failed to complete counter sale.' });
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchCat = filterCat === 'all' || item.category === filterCat;
    const matchSearch = !searchTerm.trim() ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div>
      <SectionHeader
        title="Food Counter Point of Sale (POS)"
        subtitle="Process walk-in purchases directly at the food counter with atomic inventory updates"
        actions={
          <div className="flex gap-sm items-center">
            <span className="badge badge-success"><Store size={14} style={{ marginRight: 4 }} /> Counter Active</span>
            <span className="caption text-muted">Operator: <strong style={{ color: 'var(--brand-primary)' }}>{currentUser?.name || 'Admin'}</strong></span>
          </div>
        }
      />

      {feedback.msg && (
        <div className={`alert alert-${feedback.type} mb-md flex justify-between items-center`}>
          <span>{feedback.msg}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setFeedback({ type: '', msg: '' })}>✕</button>
        </div>
      )}

      {/* POS Top Customer Bar */}
      <div className="card mb-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        <div className="flex justify-between items-center flex-wrap gap-md mb-md">
          <div className="flex items-center gap-md">
            <span className="heading-sm">Customer Identity:</span>
            <div className="flex gap-xs">
              <button
                className={`btn btn-sm ${customerType === 'guest' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={switchGuest}
              >
                Walk-in Guest
              </button>
              <button
                className={`btn btn-sm ${customerType === 'registered' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCustomerType('registered')}
              >
                Registered Student Search
              </button>
            </div>
          </div>
          {customerType === 'registered' && selectedUser && (
            <span className="badge badge-success">
              <CheckCircle size={12} style={{ marginRight: 4 }} />
              Linked to {selectedUser.name} ({selectedUser.email})
            </span>
          )}
        </div>

        {customerType === 'guest' ? (
          <div className="grid grid-2 gap-md">
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input
                className="form-input"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer (or enter name)"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone (Optional)</label>
              <input
                className="form-input"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
              />
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <div className="form-group mb-sm">
              <label className="form-label">Search Registered Student (Name or Email)</label>
              <div className="search-bar" style={{ width: '100%' }}>
                <Search size={16} className="search-icon" />
                <input
                  placeholder="Type student name or email to search..."
                  value={userSearchQuery}
                  onChange={e => handleUserSearch(e.target.value)}
                />
              </div>
            </div>

            {isSearchingUser && <div className="caption text-muted mb-xs">Searching user registry...</div>}

            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'var(--bg-card)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', zIndex: 50, maxHeight: 200, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {searchResults.map(u => (
                  <div
                    key={u.id}
                    onClick={() => selectCustomer(u)}
                    style={{
                      padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                    }}
                    className="hover-highlight"
                  >
                    <div>
                      <div className="label">{u.name}</div>
                      <div className="caption text-muted">{u.email} · {u.phone || 'No phone'}</div>
                    </div>
                    <span className="badge badge-muted">Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="order-page-layout">
        {/* Left Column: Menu Items */}
        <div>
          {/* Search and Category Filter Toolbar */}
          <div className="flex gap-md mb-md flex-wrap items-center">
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} className="search-icon" />
              <input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="tab-list">
              {[
                { key: 'all', label: 'All' },
                { key: 'thali', label: '🍱 Thalis' },
                { key: 'snacks', label: '🍔 Snacks' },
                { key: 'south-indian', label: '🥞 South Indian' },
                { key: 'meals', label: '🍛 Bowls' },
                { key: 'beverages', label: '🥤 Drinks' },
              ].map(c => (
                <div
                  key={c.key}
                  className={`tab-item ${filterCat === c.key ? 'active' : ''}`}
                  onClick={() => setFilterCat(c.key)}
                >
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-3 gap-md">
            {filteredItems.map(item => {
              const inCart = counterCart.find(c => c.menuItemId === item.id);
              const isAvailable = item.available && item.qty > 0;

              return (
                <div
                  key={item.id}
                  className="card flex flex-col justify-between"
                  style={{
                    opacity: isAvailable ? 1 : 0.6,
                    border: inCart ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    <div className="flex justify-between items-start mb-xs">
                      <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
                      <span className={`badge ${item.qty === 0 ? 'badge-danger' : item.qty < 10 ? 'badge-warning' : 'badge-success'}`}>
                        {item.qty} left
                      </span>
                    </div>
                    <div className="heading-sm mb-xs">{item.name}</div>
                    <div className="caption text-muted mb-sm" style={{ minHeight: 32 }}>
                      {item.description ? item.description.slice(0, 50) + '…' : ''}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-sm pt-sm" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <span className="heading-md text-brand">₹{item.price}</span>
                    {isAvailable ? (
                      inCart ? (
                        <div className="flex items-center gap-xs">
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => updateQty(item.id, -1)}>
                            <Minus size={14} />
                          </button>
                          <span className="label" style={{ minWidth: 20, textAlign: 'center' }}>{inCart.qty}</span>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => updateQty(item.id, 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => addToCounterCart(item)}>
                          <Plus size={14} /> Add
                        </button>
                      )
                    ) : (
                      <span className="caption text-danger font-bold">Sold Out</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Counter Cart and Payment Confirmation */}
        <div className="order-sidebar-sticky">
          <div className="card">
            <div className="flex justify-between items-center mb-md">
              <h3 className="heading-md flex items-center gap-xs">
                <ShoppingCart size={18} /> Counter Cart
              </h3>
              {counterCart.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setCounterCart([])}>Clear</button>
              )}
            </div>

            {counterCart.length === 0 ? (
              <div className="text-center" style={{ padding: '30px 10px' }}>
                <p className="caption text-muted">No items in counter cart.</p>
                <p className="caption text-muted">Click items on the left to add.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                {counterCart.map(item => (
                  <div
                    key={item.menuItemId}
                    className="flex justify-between items-center"
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <div>
                      <div className="label">{item.name}</div>
                      <div className="caption text-muted">₹{item.price} × {item.qty} = ₹{item.price * item.qty}</div>
                    </div>
                    <div className="flex items-center gap-xs">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => updateQty(item.menuItemId, -1)}>
                        <Minus size={12} />
                      </button>
                      <span className="label" style={{ minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => updateQty(item.menuItemId, 1)}>
                        <Plus size={12} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeFromCounterCart(item.menuItemId)} style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-md" style={{ borderTop: '2px dashed var(--border-default)' }}>
                  <span className="heading-md">Total Amount:</span>
                  <span className="heading-lg text-brand">₹{cartTotal}</span>
                </div>
              </div>
            )}

            {/* Pickup Slot Selector */}
            <div className="form-group mb-md">
              <label className="form-label">Pickup Timing</label>
              <select className="form-input form-select" value={pickupSlot} onChange={e => setPickupSlot(e.target.value)}>
                <option value="Instant Counter Pickup">⚡ Instant Counter Handover</option>
                <option value="12:30 PM - 1:00 PM">Slot 1 (12:30 PM - 1:00 PM)</option>
                <option value="1:00 PM - 1:30 PM">Slot 2 (1:00 PM - 1:30 PM)</option>
                <option value="1:30 PM - 2:00 PM">Slot 3 (1:30 PM - 2:00 PM)</option>
              </select>
            </div>

            {/* Payment Method Selector */}
            <div className="form-group mb-md">
              <label className="form-label">Payment Method</label>
              <div className="grid grid-3 gap-xs mb-sm">
                {[
                  { key: 'CASH', label: '💵 Cash', sub: 'Counter Cash' },
                  { key: 'UPI', label: '📱 Demo UPI', sub: 'Simulated' },
                  { key: 'CARD', label: '💳 Demo Card', sub: 'Simulated' },
                ].map(m => (
                  <div
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    style={{
                      padding: '8px 4px', textAlign: 'center', cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      border: paymentMethod === m.key ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                      background: paymentMethod === m.key ? 'rgba(108, 99, 255, 0.15)' : 'var(--bg-elevated)',
                    }}
                  >
                    <div className="caption font-bold">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Explicit Cash Confirmation Requirement */}
              {paymentMethod === 'CASH' && (
                <div style={{ background: 'var(--bg-elevated)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <label className="flex items-center gap-sm cursor-pointer" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={cashCollected}
                      onChange={e => setCashCollected(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--brand-primary)' }}
                    />
                    <div>
                      <span className="label">Confirm Cash Collected (₹{cartTotal})</span>
                      <div className="caption text-muted">
                        {cashCollected ? 'Order will be marked PAID immediately.' : 'Order will remain PENDING CASH until collected.'}
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {(paymentMethod === 'UPI' || paymentMethod === 'CARD') && (
                <div className="alert alert-info" style={{ padding: '8px 12px', fontSize: '0.75rem' }}>
                  <ShieldCheck size={14} />
                  <span>DEMO PAYMENT — No real money is charged.</span>
                </div>
              )}
            </div>

            {/* Complete Sale Button */}
            <button
              className="btn btn-primary w-full"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
              onClick={handleCheckoutCounter}
              disabled={isSubmitting || counterCart.length === 0}
            >
              {isSubmitting ? 'Recording Sale & Updating Stock…' : `Confirm Counter Sale (₹${cartTotal})`}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {receiptOrder && (
        <div className="modal-overlay" onClick={() => setReceiptOrder(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-md flex items-center gap-xs">
                <Receipt size={18} /> Food Counter Receipt
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setReceiptOrder(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <div style={{ background: '#fff', color: '#111', padding: '16px', borderRadius: 'var(--radius-md)', margin: '0 auto 16px', width: 'fit-content' }}>
                <QRCodeSVG value={receiptOrder.qrCodeData || receiptOrder.orderNumber} size={130} />
              </div>
              <h2 className="heading-lg text-brand mb-xs">{receiptOrder.orderNumber}</h2>
              <span className={`badge ${receiptOrder.paymentStatus === 'COMPLETED' ? 'badge-success' : 'badge-warning'} mb-md`}>
                Payment: {receiptOrder.paymentStatus}
              </span>

              <div style={{ textAlign: 'left', background: 'var(--bg-elevated)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <div className="flex justify-between caption text-muted mb-xs">
                  <span>Customer:</span>
                  <span className="text-primary font-bold">{receiptOrder.customerName || receiptOrder.studentName || 'Walk-in Customer'}</span>
                </div>
                <div className="flex justify-between caption text-muted mb-xs">
                  <span>Order Source:</span>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>COUNTER SALE</span>
                </div>
                <div className="flex justify-between caption text-muted mb-xs">
                  <span>Operator:</span>
                  <span className="text-primary">{receiptOrder.counterOperator || currentUser?.name || 'Admin'}</span>
                </div>
                <div className="flex justify-between caption text-muted mb-xs">
                  <span>Method:</span>
                  <span className="text-primary">{receiptOrder.paymentMethod}</span>
                </div>
                {receiptOrder.transactionId && (
                  <div className="flex justify-between caption text-muted mb-xs">
                    <span>TXN Ref:</span>
                    <span className="text-primary font-mono" style={{ fontSize: '0.7rem' }}>{receiptOrder.transactionId}</span>
                  </div>
                )}
                <div className="divider" style={{ margin: '8px 0' }} />
                <div className="label mb-xs">Items:</div>
                {receiptOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between caption">
                    <span>{it.qty}x {it.name || it.mealName}</span>
                    <span>₹{(it.price || 0) * (it.qty || 1)}</span>
                  </div>
                ))}
                <div className="divider" style={{ margin: '8px 0' }} />
                <div className="flex justify-between heading-sm text-brand">
                  <span>Total Amount:</span>
                  <span>₹{receiptOrder.totalAmount}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer flex justify-between">
              <button className="btn btn-outline" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="btn btn-primary" onClick={() => setReceiptOrder(null)}>
                New Counter Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment Records & Customer Lookup (Priority 4) ────────
export function PaymentRecordsPage() {
  const { authHeaders } = useApp();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL'); // ALL, PORTAL, COUNTER
  const [methodFilter, setMethodFilter] = useState('ALL'); // ALL, UPI, CARD, CASH, WALLET
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, COMPLETED, PENDING, FAILED
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'ALL') params.append('orderSource', sourceFilter);
      if (methodFilter !== 'ALL') params.append('paymentMethod', methodFilter);
      if (statusFilter !== 'ALL') params.append('paymentStatus', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/admin/payment-records?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else if (res.status === 401) {
        setError('Your session has expired or your authentication token is invalid. Please log out and sign in again as an Administrator.');
      } else if (res.status === 403) {
        setError('Access Forbidden: Administrator privileges (ROLE_ADMIN) are required to access financial payment records.');
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || `Failed to fetch payment records (status ${res.status})`);
      }
    } catch (err) {
      console.error('Failed to fetch payment records', err);
      setError('Network error connecting to payment records API. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, methodFilter, statusFilter, searchTerm, authHeaders]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Aggregate stats
  const totalCompletedRevenue = useMemo(() => {
    return records
      .filter(r => r.paymentStatus === 'COMPLETED')
      .reduce((acc, r) => acc + (r.totalAmount || 0), 0);
  }, [records]);

  const portalCount = useMemo(() => records.filter(r => r.orderSource === 'PORTAL').length, [records]);
  const counterCount = useMemo(() => records.filter(r => r.orderSource === 'COUNTER').length, [records]);
  const pendingCashCount = useMemo(() => records.filter(r => r.paymentStatus === 'PENDING_CASH' || r.paymentStatus === 'PENDING').length, [records]);

  return (
    <div>
      <SectionHeader
        title="Payment Records & Customer Lookup"
        subtitle="Audit real persisted payment transactions, customer details, and counter operations"
        actions={
          <button className="btn btn-outline btn-sm" onClick={fetchRecords} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'pulse' : ''} /> Refresh Records
          </button>
        }
      />

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-4 gap-md mb-xl">
        <StatCard label="Collected Revenue" value={`₹${totalCompletedRevenue.toLocaleString()}`} icon={DollarSign} variant="success" />
        <StatCard label="Total Transactions" value={records.length} icon={CreditCard} variant="primary" />
        <StatCard label="Portal vs Counter" value={`${portalCount} / ${counterCount}`} icon={Store} variant="info" />
        <StatCard label="Pending Cash" value={pendingCashCount} icon={Clock} variant={pendingCashCount > 0 ? 'warning' : 'success'} />
      </div>

      {/* Search and Filters Toolbar */}
      <div className="card mb-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
        <div className="grid grid-4 gap-md">
          {/* Search box */}
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Search (Customer Name, Email, Order #, TXN ID)</label>
            <div className="search-bar" style={{ width: '100%' }}>
              <Search size={16} className="search-icon" />
              <input
                placeholder="Type customer name, email, ORD-..., or TXN-..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Source Filter */}
          <div className="form-group">
            <label className="form-label">Order Source</label>
            <select className="form-input form-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
              <option value="ALL">All Sources (Portal + Counter)</option>
              <option value="PORTAL">Portal Only</option>
              <option value="COUNTER">Counter Only</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select className="form-input form-select" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="CASH">Cash at Counter</option>
              <option value="WALLET">Mess Wallet</option>
            </select>
          </div>
        </div>

        <div className="flex gap-md items-center mt-md pt-sm" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <span className="caption text-muted">Status Filter:</span>
          {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map(st => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(st)}
              style={{ fontSize: '0.75rem' }}
            >
              {st === 'ALL' ? 'All' : st === 'COMPLETED' ? 'Paid' : st === 'PENDING' ? 'Pending' : 'Failed'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-md">{error}</div>}

      {/* Transactions Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Source</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Payment Method</th>
              <th>Payment Status</th>
              <th>Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="flex items-center justify-center gap-sm">
                    <RefreshCw size={16} className="pulse" />
                    <span className="caption text-muted">Loading live payment records from MySQL…</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <EmptyState title="No transactions found" message="Try relaxing your search terms or filters." />
                </td>
              </tr>
            ) : (
              records.map(record => (
                <tr key={record.id}>
                  <td>
                    <div className="font-bold text-brand">{record.orderNumber}</div>
                    {record.transactionId && (
                      <div className="caption text-muted font-mono" style={{ fontSize: '0.65rem' }}>{record.transactionId}</div>
                    )}
                  </td>
                  <td>
                    {record.orderSource === 'COUNTER' ? (
                      <span className="badge badge-info flex items-center gap-xs" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                        <Store size={10} /> Counter
                      </span>
                    ) : (
                      <span className="badge badge-primary flex items-center gap-xs" style={{ width: 'fit-content', fontSize: '0.7rem' }}>
                        Portal
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="label">{record.customerName || record.studentName || 'Walk-in Customer'}</div>
                    <div className="caption text-muted">{record.userEmail || (record.orderSource === 'COUNTER' ? 'Walk-in Sale' : 'Registered Student')}</div>
                  </td>
                  <td>
                    <div className="caption text-secondary" style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {record.items && record.items.length > 0
                        ? record.items.map(i => `${i.qty}x ${i.name || i.mealName}`).join(', ')
                        : 'Meal items'}
                    </div>
                  </td>
                  <td className="heading-sm text-brand">₹{record.totalAmount}</td>
                  <td>
                    <span className="badge badge-muted" style={{ textTransform: 'capitalize' }}>
                      {record.paymentMethod}
                    </span>
                  </td>
                  <td>
                    {record.paymentStatus === 'COMPLETED' ? (
                      <span className="badge badge-success flex items-center gap-xs" style={{ width: 'fit-content' }}>
                        <CheckCircle size={10} /> Paid
                      </span>
                    ) : record.paymentStatus === 'PENDING_CASH' || record.paymentStatus === 'PENDING' ? (
                      <span className="badge badge-warning flex items-center gap-xs" style={{ width: 'fit-content' }}>
                        <Clock size={10} /> Pending
                      </span>
                    ) : (
                      <span className="badge badge-danger flex items-center gap-xs" style={{ width: 'fit-content' }}>
                        <XCircle size={10} /> {record.paymentStatus}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="caption text-muted">
                      {record.orderTime ? new Date(record.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={() => setSelectedRecord(record)}
                      title="Inspect Transaction Details"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Inspection Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-lg flex items-center gap-xs">
                <Receipt size={18} /> Transaction Detail Verification
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedRecord(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="flex justify-between items-center mb-md p-md" style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span className="caption text-muted">Order Number</span>
                  <div className="heading-lg text-brand">{selectedRecord.orderNumber}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="caption text-muted">Order Source</span>
                  <div>
                    {selectedRecord.orderSource === 'COUNTER' ? (
                      <span className="badge badge-info"><Store size={12} style={{ marginRight: 4 }} /> Counter Sale</span>
                    ) : (
                      <span className="badge badge-primary">Student Portal</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-2 gap-md mb-md">
                <div>
                  <div className="caption text-muted">Customer Name</div>
                  <div className="label">{selectedRecord.customerName || selectedRecord.studentName || 'Walk-in Customer'}</div>
                </div>
                <div>
                  <div className="caption text-muted">Customer Identifier</div>
                  <div className="label">{selectedRecord.userEmail || 'Walk-in / None'}</div>
                </div>
                <div>
                  <div className="caption text-muted">Payment Method</div>
                  <div className="label">{selectedRecord.paymentMethod}</div>
                </div>
                <div>
                  <div className="caption text-muted">Payment Status</div>
                  <div>
                    <span className={`badge ${selectedRecord.paymentStatus === 'COMPLETED' ? 'badge-success' : selectedRecord.paymentStatus === 'PENDING_CASH' ? 'badge-warning' : 'badge-danger'}`}>
                      {selectedRecord.paymentStatus}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="caption text-muted">Transaction ID</div>
                  <div className="label font-mono" style={{ fontSize: '0.75rem' }}>{selectedRecord.transactionId || 'None'}</div>
                </div>
                <div>
                  <div className="caption text-muted">Pickup Slot</div>
                  <div className="label">{selectedRecord.pickupSlot || 'Instant Pickup'}</div>
                </div>
                <div>
                  <div className="caption text-muted">Kitchen Preparation Status</div>
                  <div><StatusBadge status={selectedRecord.status} /></div>
                </div>
                <div>
                  <div className="caption text-muted">Operator</div>
                  <div className="label">{selectedRecord.counterOperator || 'Student Portal'}</div>
                </div>
              </div>

              <div className="label mb-xs">Purchased Items Breakdown</div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: 16 }}>
                {selectedRecord.items && selectedRecord.items.length > 0 ? (
                  selectedRecord.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between caption" style={{ padding: '4px 0', borderBottom: idx < selectedRecord.items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span>{it.qty}x {it.name || it.mealName}</span>
                      <span>₹{(it.price || 0) * (it.qty || 1)}</span>
                    </div>
                  ))
                ) : (
                  <div className="caption text-muted">Items detail unavailable</div>
                )}
                <div className="flex justify-between heading-sm text-brand pt-sm mt-xs" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span>Total Amount Paid</span>
                  <span>₹{selectedRecord.totalAmount}</span>
                </div>
              </div>

              {selectedRecord.qrCodeData && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: 'var(--radius-sm)', width: 'fit-content', margin: '0 auto 8px' }}>
                    <QRCodeSVG value={selectedRecord.qrCodeData} size={100} />
                  </div>
                  <div className="caption text-muted">Scan QR at counter for order pickup verification</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary w-full" onClick={() => setSelectedRecord(null)}>
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
