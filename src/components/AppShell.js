import React, { useState, useEffect, useMemo } from 'react';
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
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = (data?.user?.email || '').toLowerCase();
      setIsAdmin(ADMIN_EMAILS.includes(email));
    });
  }, []);

  // Trial countdown: only relevant before the landlord has ever been
  // through Stripe checkout (has_subscription false). Once they've
  // subscribed, Stripe's own billing status takes over and this banner
  // never shows again.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/billing/plan/${user.id}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        const data = await res.json();
        if (!active || !res.ok) return;
        if (!data.has_subscription && data.trial_ends_at) {
          setTrialEndsAt(data.trial_ends_at);
        }
      } catch (err) {
        console.error('Error loading trial status:', err);
      }
    })();
    return () => { active = false; };
  }, []);

  // Tick once a minute so the countdown stays live while the banner is open.
  useEffect(() => {
    if (!trialEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, [trialEndsAt]);

  const trialCountdown = useMemo(() => {
    if (!trialEndsAt) return null;
    const msLeft = new Date(trialEndsAt).getTime() - now;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (msLeft > SEVEN_DAYS_MS) return null;
    if (msLeft <= 0) return { expired: true };
    const totalMinutes = Math.floor(msLeft / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return { expired: false, days, hours, minutes };
  }, [trialEndsAt, now]);

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
      <main className={`pd-main${wide ? ' pd-main-wide' : ''}`}>
        {trialCountdown && (
          <div className="pd-trial-banner" role="status">
            <span className="pd-trial-banner-text">
              {trialCountdown.expired
                ? "Your free trial has ended — subscribe to keep your account active."
                : `Your free trial ends in ${trialCountdown.days > 0 ? `${trialCountdown.days}d ` : ''}${trialCountdown.hours}h ${trialCountdown.minutes}m — subscribe to keep your account active.`}
            </span>
            <Link to="/payment" className="pd-trial-banner-cta" onClick={closeNav}>View plans</Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
