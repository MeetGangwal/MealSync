import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ROLES } from './data/mockData';
import LoginPage from './pages/LoginPage';
import { Sidebar, Topbar } from './components/Shared';
import StudentDashboard from './pages/StudentDashboard';
import OrderPage from './pages/OrderPage';
import MyOrdersPage from './pages/MyOrdersPage';
import StaffDashboard from './pages/StaffDashboard';
import AllOrdersPage from './pages/AllOrdersPage';
import {
  AdminDashboard, MenuManagement, AnalyticsPage,
  CloudMonitoring, WastageReport, DemandForecast,
} from './pages/AdminPages';
import {
  LiveMenuPage, SubscriptionPage, QRTicketsPage, ProfilePage,
  SlotManagement, StaffManagement,
} from './pages/OtherPages';

function getDefaultPage(role) {
  if (role === ROLES.STUDENT) return 'dashboard';
  if (role === ROLES.THALI_STAFF || role === ROLES.DISHES_STAFF) return 'staff-dashboard';
  if (role === ROLES.ADMIN) return 'admin-dashboard';
  return 'dashboard';
}

function AppInner() {
  const { currentUser } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Switch to the right default page when the user logs in / out
  useEffect(() => {
    if (currentUser) setCurrentPage(getDefaultPage(currentUser.role));
  }, [currentUser?.id]);

  if (!currentUser) return <LoginPage />;

  const role = currentUser.role;

  function renderPage() {
    switch (currentPage) {
      // ── Student ──────────────────────────────
      case 'dashboard':       return <StudentDashboard setPage={setCurrentPage} />;
      case 'menu':            return <LiveMenuPage setPage={setCurrentPage} />;
      case 'order':           return <OrderPage setPage={setCurrentPage} />;
      case 'my-orders':       return <MyOrdersPage setPage={setCurrentPage} />;
      case 'qr':              return <QRTicketsPage />;
      case 'subscription':    return <SubscriptionPage />;
      case 'profile':         return <ProfilePage />;

      // ── Counter Staff ─────────────────────────
      case 'staff-dashboard':
      case 'thali-orders':
      case 'dishes-orders':
      case 'qr-scanner':
      case 'upcoming':
        return <StaffDashboard counterType={role === ROLES.THALI_STAFF ? 'thali' : 'dishes'} />;

      // ── Admin ──────────────────────────────────
      case 'admin-dashboard': return <AdminDashboard setPage={setCurrentPage} />;
      case 'admin-orders':    return <AllOrdersPage />;
      case 'menu-mgmt':       return <MenuManagement />;
      case 'slot-mgmt':       return <SlotManagement />;
      case 'analytics':       return <AnalyticsPage />;
      case 'forecasting':     return <DemandForecast />;
      case 'wastage':         return <WastageReport />;
      case 'staff-mgmt':      return <StaffManagement />;
      case 'monitoring':      return <CloudMonitoring />;
      case 'settings':
        return (
          <div>
            <h1 className="heading-lg" style={{ marginBottom: 8 }}>Settings</h1>
            <p className="text-muted">Platform configuration — coming in Phase 2.</p>
          </div>
        );

      default: return <StudentDashboard setPage={setCurrentPage} />;
    }
  }

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} setPage={setCurrentPage} />
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
