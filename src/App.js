import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './App.css';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import PaymentPage from './pages/PaymentPage';
import SubscribePage from './pages/SubscribePage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CommunicationCenterPage from './pages/CommunicationCenterPage';
import PropertiesPage from './pages/PropertiesPage';
import ReportsPage from './pages/ReportsPage';
import InsightsPage from './pages/InsightsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CancelDeletionPage from './pages/CancelDeletionPage';
import MaintenancePage from './pages/MaintenancePage';
import TenantLoginPage from './pages/TenantLoginPage';
import TenantSetPasswordPage from './pages/TenantSetPasswordPage';
import TenantPortalPage from './pages/TenantPortalPage';
import TenantMaintenancePage from './pages/TenantMaintenancePage';
import LeaseRenewalsPage from './pages/LeaseRenewalsPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import NotFoundPage from './pages/NotFoundPage';
import HelpPage from './pages/HelpPage';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsentBanner from './components/CookieConsentBanner';
import { ADMIN_EMAILS } from './utils/adminEmails';
import { apiRequest } from './utils/api';
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);
const supabaseTenant = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-tenant-auth' } }
);

// Sends a GA4 page_view on every client-side route change (SPA navigations
// don't trigger a normal page load, so gtag's automatic pageview misses them).
function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-8VD7EFE62G', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
  return null;
}

function App() {
  const [user, setUser] = useState(null);
  const [tenantUser, setTenantUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI-only hint: which landing page "/" shows. Not a security boundary --
  // see src/utils/adminEmails.js.
  const isAdmin = Boolean(user && ADMIN_EMAILS.includes((user.email || '').toLowerCase()));

  // Whether this landlord has ever been through Stripe Checkout --
  // null while unknown/loading, otherwise the parsed /api/billing/plan
  // response. Admins skip this check entirely (they aren't landlords).
  // Gates the core app routes below: a logged-in user with no
  // subscription is sent to the mandatory plan-selection page instead of
  // the dashboard, rather than relying only on individual API calls to
  // 402 and bounce them there after the fact.
  const [billingInfo, setBillingInfo] = useState(null);

  useEffect(() => {
    if (!user || isAdmin) {
      setBillingInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const data = await apiRequest(
          `${process.env.REACT_APP_BACKEND_URL}/api/billing/plan/${user.id}`,
          { headers: { Authorization: `Bearer ${session?.access_token}` } }
        );
        if (!cancelled) setBillingInfo(data);
      } catch (err) {
        console.error('Billing status check failed, allowing through:', err);
        // Fail OPEN, same philosophy as requireActiveBilling server-side --
        // a billing-check bug on our end should never be the reason a
        // paying landlord gets locked out of their own data.
        if (!cancelled) setBillingInfo({ has_subscription: true });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]);

  // True only once we know for sure -- while billingInfo is still loading
  // for a non-admin user, gated() shows a spinner instead of guessing.
  const billingReady = isAdmin || billingInfo !== null;
  const needsSubscription = !isAdmin && billingInfo && billingInfo.has_subscription === false;

  // Wraps the core app pages: redirects a logged-out user to /login (same
  // as every other protected route), a logged-in user with no active
  // subscription to /subscribe, and otherwise renders the page. Pages not
  // central to the paid product (billing itself, settings, admin, help)
  // intentionally skip this and keep their existing per-route checks.
  const gated = (element) => {
    if (!user) return <Navigate to="/login" />;
    if (!billingReady) return <div className="loading-container"><div className="spinner"></div></div>;
    if (needsSubscription) return <Navigate to="/subscribe" />;
    return element;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      const { data: { session: tenantSession } } = await supabaseTenant.auth.getSession();
      setTenantUser(tenantSession?.user || null);
      setLoading(false);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    const { data: { subscription: tenantSubscription } } = supabaseTenant.auth.onAuthStateChange((_event, session) => {
      setTenantUser(session?.user || null);
    });
    return () => {
      subscription?.unsubscribe();
      tenantSubscription?.unsubscribe();
    };
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Loading...</p></div>;

  return (
    <ErrorBoundary>
      <Router>
        <AnalyticsTracker />
        <CookieConsentBanner />
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/cancel-deletion" element={<CancelDeletionPage />} />
          <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/payment" element={user ? <PaymentPage /> : <Navigate to="/login" />} />
          <Route path="/subscribe" element={user ? <SubscribePage /> : <Navigate to="/login" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user ? <AdminDashboardPage /> : <Navigate to="/login" />} />
          <Route path="/messages" element={gated(<CommunicationCenterPage />)} />
          <Route path="/properties" element={gated(<PropertiesPage />)} />
          <Route path="/reports" element={gated(<ReportsPage />)} />
          <Route path="/insights" element={gated(<InsightsPage />)} />
          <Route path="/maintenance" element={gated(<MaintenancePage />)} />
          <Route path="/tenant/login" element={!tenantUser ? <TenantLoginPage /> : <Navigate to="/tenant" />} />
          <Route path="/tenant/set-password" element={<TenantSetPasswordPage />} />
          <Route path="/tenant" element={tenantUser ? <TenantPortalPage /> : <Navigate to="/tenant/login" />} />
          <Route path="/tenant/maintenance" element={tenantUser ? <TenantMaintenancePage /> : <Navigate to="/tenant/login" />} />
          <Route path="/renewals" element={gated(<LeaseRenewalsPage />)} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/" element={isAdmin ? (user ? <AdminDashboardPage /> : <Navigate to="/login" />) : gated(<DashboardPage />)} />
          <Route path="/dashboard" element={gated(<DashboardPage />)} />
          <Route path="/help" element={user ? <HelpPage /> : <Navigate to="/login" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;