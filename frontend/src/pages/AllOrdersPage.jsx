import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SectionHeader, StatusBadge } from '../components/Shared';
import { ORDER_STATUS } from '../data/mockData';
import { Search, Filter, ChevronDown, ChevronUp, Download } from 'lucide-react';

export default function AllOrdersPage() {
  const { orders, updateOrderStatus } = useApp();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter;
    const matchSearch = !search || o.id.includes(search.toUpperCase()) || o.studentName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <SectionHeader
        title="All Orders"
        subtitle={`${orders.length} total orders`}
        actions={
          <button className="btn btn-ghost"><Download size={16} /> Export CSV</button>
        }
      />

      <div className="flex gap-md mb-lg flex-wrap">
        <div className="search-bar" style={{ width: 300 }}>
          <Search size={16} className="search-icon" />
          <input placeholder="Search by order ID or student name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tab-list">
          {['all', ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].map(f => (
            <div key={f} className={`tab-item ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              {f !== 'all' && <span className="badge badge-muted" style={{ marginLeft: 4 }}>{orders.filter(o => o.status === f).length}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead><tr>
            <th>Order ID</th><th>Student</th><th>Items</th><th>Total</th><th>Slot</th><th>Thali</th><th>Dishes</th><th>Status</th><th>QR</th>
          </tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                <td style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{o.id}</td>
                <td>
                  <div>{o.studentName}</div>
                  <div className="caption text-muted">{o.studentUID}</div>
                </td>
                <td className="truncate" style={{ maxWidth: 200 }}>{o.items.map(i => `${i.name}×${i.qty}`).join(', ')}</td>
                <td>₹{o.total}</td>
                <td>{o.slotLabel}</td>
                <td><span className={`badge ${o.thaliStatus === 'served' ? 'badge-success' : o.thaliStatus === 'na' ? 'badge-muted' : 'badge-warning'}`}>{o.thaliStatus}</span></td>
                <td><span className={`badge ${o.dishesStatus === 'served' ? 'badge-success' : o.dishesStatus === 'na' ? 'badge-muted' : 'badge-warning'}`}>{o.dishesStatus}</span></td>
                <td><StatusBadge status={o.status} /></td>
                <td>{o.qrVerified ? '✅' : '⏳'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
