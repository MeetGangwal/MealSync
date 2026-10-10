import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  ShoppingCart, TrendingUp, Users, AlertTriangle, Package, Clock,
  DollarSign, Cpu, Activity, Zap, CheckCircle, XCircle, BarChart3,
  Edit, Trash2, Plus, Eye, Settings,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatCard, SectionHeader, StatusBadge, ProgressBar, AlertBanner, EmptyState } from '../components/Shared';
import { ANALYTICS_DATA, ORDER_STATUS, ITEM_CATEGORY } from '../data/mockData';

// ─── Admin Dashboard ──────────────────────────────────────
export function AdminDashboard({ setPage }) {
  const { orders, menuItems } = useApp();
  const a = ANALYTICS_DATA;

  const totalRevenue = a.todayRevenue;
  const todayOrders = orders.length;
  const pending = orders.filter(o => o.status === ORDER_STATUS.PREPARING || o.status === ORDER_STATUS.CONFIRMED || o.status === ORDER_STATUS.READY).length;
  const completed = orders.filter(o => o.status === ORDER_STATUS.COMPLETED).length;

  const COLORS = ['#6C63FF', '#43E97B', '#F7971E', '#00C6FB', '#FF6584', '#FFD200'];

  return (
    <div>
      <SectionHeader
        title="Mess Dashboard"
        subtitle="Operations overview — SPIT Mumbai Mess"
        actions={
          <div className="flex gap-sm">
            <div className="flex items-center gap-sm">
              <div className="status-dot online pulse" />
              <span className="body-sm text-success">Live</span>
            </div>
            <span className="badge badge-success badge-lg">Thali Counter 🟢</span>
            <span className="badge badge-success badge-lg">Dishes Counter 🟢</span>
          </div>
        }
      />

      {/* ── Key Metrics ───────────────────────────────── */}
      <div className="grid grid-5 mb-xl">
        <StatCard label="Orders Today" value={todayOrders} icon={ShoppingCart} variant="primary" trend={12} />
        <StatCard label="Completed" value={completed} icon={CheckCircle} variant="success" />
        <StatCard label="Pending" value={pending} icon={Clock} variant="warning" />
        <StatCard label="Revenue" value={`₹${a.todayRevenue.toLocaleString()}`} icon={TrendingUp} variant="info" trend={8} />
        <StatCard label="Avg Pickup" value={`${a.avgPickupTime}m`} icon={Zap} variant="danger" sub="minutes" />
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
  const { menuItems, updateMenuItem, addMenuItem, deleteMenuItem } = useApp();
  const [editModal, setEditModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({});

  const openEdit = (item) => { setForm({ ...item }); setEditModal(item.id); };
  const saveEdit = () => { updateMenuItem(editModal, form); setEditModal(null); };
  const openAdd = () => {
    setForm({ name: '', category: ITEM_CATEGORY.THALI, emoji: '🍽️', price: 0, initialQty: 100, description: '', counter: 'thali', available: true });
    setAddModal(true);
  };
  const saveAdd = () => { addMenuItem(form); setAddModal(false); };

  return (
    <div>
      <SectionHeader
        title="Menu Management"
        subtitle="Control today's menu, prices, and availability"
        actions={<button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Item</button>}
      />
      <div className="table-container">
        <table>
          <thead><tr>
            <th>Item</th><th>Counter</th><th>Price</th><th>Qty</th><th>Status</th><th>Rating</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {menuItems.map(item => (
              <tr key={item.id}>
                <td>
                  <div className="flex items-center gap-sm">
                    <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
                    <div>
                      <div className="label">{item.name}</div>
                      <div className="caption text-muted">{item.description.slice(0, 40)}…</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${item.counter === 'thali' ? 'badge-primary' : 'badge-info'}`}>
                    {item.counter === 'thali' ? '🍱 Thali' : '🍴 Dishes'}
                  </span>
                </td>
                <td className="heading-sm">₹{item.price}</td>
                <td>
                  <ProgressBar value={item.qty} max={item.initialQty} variant={item.qty === 0 ? 'danger' : item.qty < 30 ? 'warning' : 'success'} showValue />
                </td>
                <td>
                  <div className="flex items-center gap-sm">
                    <div className={`status-dot ${item.available && item.qty > 0 ? 'online' : 'offline'}`} />
                    <span className="body-sm">{item.available && item.qty > 0 ? 'Available' : 'Sold Out'}</span>
                  </div>
                </td>
                <td>⭐ {item.rating}</td>
                <td>
                  <div className="flex gap-xs">
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => updateMenuItem(item.id, { available: !item.available })} title="Toggle availability">
                      {item.available ? <Eye size={14} color="var(--color-success)" /> : <Eye size={14} color="var(--text-muted)" />}
                    </button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(item)}><Edit size={14} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteMenuItem(item.id)} style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
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
              <h3 className="heading-lg">Edit Menu Item</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditModal(null)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <MenuItemForm form={form} setForm={setForm} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="heading-lg">Add Menu Item</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAddModal(false)}><XCircle size={18} /></button>
            </div>
            <div className="modal-body">
              <MenuItemForm form={form} setForm={setForm} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveAdd}>Add Item</button>
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
          <label className="form-label">Name</label>
          <input className="form-input" value={form.name || ''} onChange={e => f('name', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Emoji</label>
          <input className="form-input" value={form.emoji || ''} onChange={e => f('emoji', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-2 gap-md">
        <div className="form-group">
          <label className="form-label">Price (₹)</label>
          <input className="form-input" type="number" value={form.price || 0} onChange={e => f('price', +e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Initial Quantity</label>
          <input className="form-input" type="number" value={form.initialQty || 0} onChange={e => f('initialQty', +e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Counter</label>
        <select className="form-input form-select" value={form.counter || 'thali'} onChange={e => { f('counter', e.target.value); f('category', e.target.value === 'thali' ? ITEM_CATEGORY.THALI : ITEM_CATEGORY.DISHES); }}>
          <option value="thali">Thali Counter</option>
          <option value="dishes">Dishes Counter</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-input form-textarea" style={{ minHeight: 70 }} value={form.description || ''} onChange={e => f('description', e.target.value)} />
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

// ─── Wastage Report ───────────────────────────────────────
export function WastageReport() {
  const a = ANALYTICS_DATA;
  return (
    <div>
      <SectionHeader title="Food Wastage Analytics" subtitle="Monitor and minimize food wastage" />
      <div className="grid grid-3 mb-xl">
        <StatCard label="Avg Wastage/Day" value="32 portions" icon={AlertTriangle} variant="warning" />
        <StatCard label="Wastage Value" value="₹1,280" icon={TrendingUp} variant="danger" sub="this week" />
        <StatCard label="Wastage %" value="6.4%" icon={Activity} variant="info" />
      </div>
      <div className="chart-container mb-lg">
        <div className="chart-title">Weekly Wastage Analysis</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={a.wastage}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)' }} />
            <Legend />
            <Bar dataKey="prepared" fill="#6C63FF" name="Prepared" radius={[2, 2, 0, 0]} />
            <Bar dataKey="ordered" fill="#43E97B" name="Ordered" radius={[2, 2, 0, 0]} />
            <Bar dataKey="collected" fill="#F7971E" name="Collected" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-3 gap-md">
        {a.wastage.map(d => (
          <div key={d.day} className="card">
            <div className="heading-md mb-sm">{d.day}</div>
            <div className="flex justify-between mb-xs"><span className="body-sm text-secondary">Prepared</span><span className="label">{d.prepared}</span></div>
            <div className="flex justify-between mb-xs"><span className="body-sm text-secondary">Ordered</span><span className="label text-success">{d.ordered}</span></div>
            <div className="flex justify-between mb-xs"><span className="body-sm text-secondary">Collected</span><span className="label text-info">{d.collected}</span></div>
            <div className="divider" />
            <div className="flex justify-between"><span className="body-sm text-secondary">Wasted</span><span className="label text-danger">{d.prepared - d.collected}</span></div>
          </div>
        ))}
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
