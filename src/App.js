import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './App.css';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import PaymentPage from './pages/PaymentPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CommunicationCenterPage from './pages/CommunicationCenterPage';
import PropertiesPage from './pages/PropertiesPage';
import ReportsPage from './pages/ReportsPage';
import InsightsPage from './pages/InsightsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MaintenancePage from './pages/MaintenancePage';
import TenantLoginPage from './pages/TenantLoginPage';
import TenantSetPasswordPage from './pages/TenantSetPasswordPage';
import TenantPortalPage from './pages/TenantPortalPage';
import TenantMaintenancePage from './pages/TenantMaintenancePage';
import LeaseRenewalsPage from './pages/LeaseRenewalsPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import NotFoundPage from './pages/NotFoundPage';
import { ADMIN_EMAILS } from './utils/adminEmails';
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

function App() {
  const [user, setUser] = useState(null);
  const [tenantUser, setTenantUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI-only hint: which landing page "/" shows. Not a security boundary --
  // see src/utils/adminEmails.js.
  const isAdmin = Boolean(user && ADMIN_EMAILS.includes((user.email || '').toLowerCase()));

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
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/login" />} />
        <Route path="/payment" element={user ? <PaymentPage /> : <Navigate to="/login" />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/login" />} />
        <Route path="/admin" element={user ? <AdminDashboardPage /> : <Navigate to="/login" />} />
        <Route path="/messages" element={user ? <CommunicationCenterPage /> : <Navigate to="/login" />} />
        <Route path="/properties" element={user ? <PropertiesPage /> : <Navigate to="/login" />} />
        <Route path="/reports" element={user ? <ReportsPage /> : <Navigate to="/login" />} />
        <Route path="/insights" element={user ? <InsightsPage /> : <Navigate to="/login" />} />
        <Route path="/maintenance" element={user ? <MaintenancePage /> : <Navigate to="/login" />} />
        <Route path="/tenant/login" element={!tenantUser ? <TenantLoginPage /> : <Navigate to="/tenant" />} />
        <Route path="/tenant/set-password" element={<TenantSetPasswordPage />} />
        <Route path="/tenant" element={tenantUser ? <TenantPortalPage /> : <Navigate to="/tenant/login" />} />
        <Route path="/tenant/maintenance" element={tenantUser ? <TenantMaintenancePage /> : <Navigate to="/tenant/login" />} />
        <Route path="/renewals" element={user ? <LeaseRenewalsPage /> : <Navigate to="/login" />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/" element={user ? (isAdmin ? <AdminDashboardPage /> : <DashboardPage />) : <Navigate to="/login" />} />
        <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;