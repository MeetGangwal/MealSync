import { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import { Sidebar, Topbar, Toaster, pageLabel } from './components/Shared';
import StudentDashboard from './pages/StudentDashboard';
import OrderPage from './pages/OrderPage';
import MyOrdersPage from './pages/MyOrdersPage';
import AllOrdersPage from './pages/AllOrdersPage';
import { MenuManagement, CounterSalePage, UserManagementPage } from './pages/AdminPages';
import {
  AdminDashboard, PaymentRecordsPage, AnalyticsPage, DemandForecast, CloudMonitoring, SlotManagement,
} from './pages/AdminReports';
import { LiveMenuPage, SubscriptionPage, QRTicketsPage, ProfilePage } from './pages/OtherPages';

// Pages every signed-in user can open (administrators are also customers)
const CUSTOMER_PAGES = {
  dashboard: StudentDashboard,
  menu: LiveMenuPage,
  order: OrderPage,
  'my-orders': MyOrdersPage,
  qr: QRTicketsPage,
  subscription: SubscriptionPage,
  profile: ProfilePage,
};

// Pages that require the server-issued administrator role
const ADMIN_PAGES = {
  'admin-dashboard': AdminDashboard,
  'counter-sale': CounterSalePage,
  'payment-records': PaymentRecordsPage,
  'admin-orders': AllOrdersPage,
  'menu-mgmt': MenuManagement,
  'slot-mgmt': SlotManagement,
  'user-mgmt': UserManagementPage,
  analytics: AnalyticsPage,
  forecasting: DemandForecast,
  monitoring: CloudMonitoring,
};

/** Page key from the URL hash ("#/my-orders" → "my-orders"); section anchors like "#menu" are ignored. */
function hashRoute() {
  const h = window.location.hash;
  return h.startsWith('#/') ? h.slice(2) : '';
}

/** Keeps the page key in sync with the URL hash so links, reloads and the Back button work. */
function useHashRoute() {
  const [route, setRoute] = useState(hashRoute);
  useEffect(() => {
    const onChange = () => setRoute(hashRoute());
    window.addEventListener('popstate', onChange);
    window.addEventListener('hashchange', onChange);
    return () => { window.removeEventListener('popstate', onChange); window.removeEventListener('hashchange', onChange); };
  }, []);
  const navigate = useCallback((key, { replace = false } = {}) => {
    const url = key ? `#/${key}` : `${window.location.pathname}${window.location.search}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setRoute(key);
    window.scrollTo(0, 0);
  }, []);
  return [route, navigate];
}

function AppInner() {
  const { currentUser, authChecking } = useApp();
  const [route, navigate] = useHashRoute();
  const [navOpen, setNavOpen] = useState(false);
  const isAdmin = Boolean(currentUser?.isAdmin);
  const home = isAdmin ? 'admin-dashboard' : 'dashboard';
  const allowed = useCallback(
    (key) => Boolean(CUSTOMER_PAGES[key] || (isAdmin && ADMIN_PAGES[key])), [isAdmin]);

  // Signed-in users land on their home page unless the URL names a page they may open.
  // Admin pages are navigation only — the backend rejects admin API calls from non-administrators.
  useEffect(() => {
    if (authChecking) return;
    if (currentUser && !allowed(route)) navigate(home, { replace: true });
    if (!currentUser && route && route !== 'login' && route !== 'register') navigate('', { replace: true });
  }, [currentUser, authChecking, route, allowed, home, navigate]);

  useEffect(() => {
    const label = currentUser ? pageLabel(route) : '';
    document.title = label ? `${label} · MealSync` : 'MealSync — Campus Mess Ordering';
  }, [currentUser, route]);

  if (authChecking) {
    return (
      <div className="page-loading" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>Checking your session…</span>
      </div>
    );
  }

  if (!currentUser) {
    if (route === 'login' || route === 'register') {
      return (
        <>
          <LoginPage mode={route} onModeChange={(m) => navigate(m, { replace: true })} onBack={() => navigate('')} />
          <Toaster />
        </>
      );
    }
    return <LandingPage onSignIn={() => navigate('login')} onRegister={() => navigate('register')} />;
  }

  const goTo = (page) => {
    navigate(page);
    setNavOpen(false);
  };

  const pageKey = allowed(route) ? route : home;
  const Page = (isAdmin && ADMIN_PAGES[pageKey]) || CUSTOMER_PAGES[pageKey] || StudentDashboard;

  return (
    <div className={`app-layout ${navOpen ? 'nav-open' : ''}`}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <Sidebar currentPage={pageKey} setPage={goTo} />
      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div className="main-content">
        <Topbar onMenuToggle={() => setNavOpen(o => !o)} navOpen={navOpen} currentPage={pageKey} />
        <main className="page-content" id="main" tabIndex={-1} key={pageKey}>
          <Page setPage={goTo} />
        </main>
      </div>
      <Toaster />
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
