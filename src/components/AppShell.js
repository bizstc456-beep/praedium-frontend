import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

// UI-only hint to show the Admin link. This is NOT a security boundary --
// /admin itself is enforced server-side by the backend's admin allowlist.
const ADMIN_EMAILS = ['bizstc456@gmail.com'];

// Shared sidebar layout for the logged-in app. Wrap a page's content with
// <AppShell active="dashboard">...</AppShell> to get the nav + sign out.
export default function AppShell({ active, wide, children }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = (data?.user?.email || '').toLowerCase();
      setIsAdmin(ADMIN_EMAILS.includes(email));
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };
  const closeNav = () => setNavOpen(false);

  const linkClass = (page) => (active === page ? 'pd-nav-link current' : 'pd-nav-link');

  return (
    <div className="pd-shell">
      <div className="pd-mobile-bar">
        <div className="pd-brand">Praedium</div>
        <button
          type="button"
          className="pd-nav-toggle"
          aria-label="Toggle navigation menu"
          onClick={() => setNavOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {navOpen && <div className="pd-nav-backdrop" onClick={closeNav} />}
      <aside className={`pd-side${navOpen ? ' pd-side-open' : ''}`}>
        <div className="pd-brand">Praedium</div>
        <nav className="pd-nav">
          <Link to="/" className={linkClass('dashboard')} onClick={closeNav}>Dashboard</Link>
          <Link to="/insights" className={linkClass('insights')} onClick={closeNav}>Insights</Link>
          <Link to="/properties" className={linkClass('properties')} onClick={closeNav}>Properties</Link>
          <Link to="/reports" className={linkClass('reports')} onClick={closeNav}>Reports</Link>
          <Link to="/maintenance" className={linkClass('maintenance')} onClick={closeNav}>Maintenance</Link>
          <Link to="/renewals" className={linkClass('renewals')} onClick={closeNav}>Lease Renewals</Link>
          <Link to="/messages" className={linkClass('messages')} onClick={closeNav}>Messages</Link>
          <Link to="/payment" className={linkClass('billing')} onClick={closeNav}>Billing</Link>
          <Link to="/settings" className={linkClass('settings')} onClick={closeNav}>Settings</Link>
          {isAdmin && <Link to="/admin" className={linkClass('admin')} onClick={closeNav}>Admin</Link>}
        </nav>
        <button onClick={handleLogout} className="pd-signout">Sign Out</button>
        <a href="mailto:support@praedium.pro" className="pd-support-link">Need help? Contact support</a>
      </aside>
      <main className={`pd-main${wide ? ' pd-main-wide' : ''}`}>{children}</main>
    </div>
  );
}
