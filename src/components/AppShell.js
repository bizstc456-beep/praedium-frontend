import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { ADMIN_EMAILS } from '../utils/adminEmails';
import LanguageToggle from './LanguageToggle';
import LanguagePrompt from './LanguagePrompt';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

// Shared sidebar layout for the logged-in app. Wrap a page's content with
// <AppShell active="dashboard">...</AppShell> to get the nav + sign out.
export default function AppShell({ active, wide, children }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);

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

  // Language preference: if the account already has one saved, make sure
  // this device/browser reflects it (keeps multiple devices in sync). If
  // it has never been set, show the first-use prompt once.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/account`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (!active || !res.ok) return;
        if (data.preferred_language) {
          if (i18n.language !== data.preferred_language) {
            i18n.changeLanguage(data.preferred_language);
          }
        } else {
          setShowLanguagePrompt(true);
        }
      } catch (err) {
        console.error('Error loading language preference:', err);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLanguageSelect = async (lang) => {
    setShowLanguagePrompt(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ preferred_language: lang }),
      });
    } catch (err) {
      // Best-effort -- the UI already switched language locally regardless.
      console.error('Error saving language preference:', err);
    }
  };

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
      {showLanguagePrompt && <LanguagePrompt onSelect={handleLanguageSelect} />}
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
          {isAdmin && (
            <>
              <Link to="/admin" className={linkClass('admin')} onClick={closeNav}>{t('nav.admin')}</Link>
              <div className="pd-nav-section-label">{t('nav.landlordView')}</div>
            </>
          )}
          <Link to={isAdmin ? '/dashboard' : '/'} className={linkClass('dashboard')} onClick={closeNav}>{t('nav.dashboard')}</Link>
          <Link to="/insights" className={linkClass('insights')} onClick={closeNav}>{t('nav.insights')}</Link>
          <Link to="/properties" className={linkClass('properties')} onClick={closeNav}>{t('nav.properties')}</Link>
          <Link to="/reports" className={linkClass('reports')} onClick={closeNav}>{t('nav.reports')}</Link>
          <Link to="/maintenance" className={linkClass('maintenance')} onClick={closeNav}>{t('nav.maintenance')}</Link>
          <Link to="/renewals" className={linkClass('renewals')} onClick={closeNav}>{t('nav.renewals')}</Link>
          <Link to="/messages" className={linkClass('messages')} onClick={closeNav}>{t('nav.messages')}</Link>
          <Link to="/payment" className={linkClass('billing')} onClick={closeNav}>{t('nav.billing')}</Link>
          <Link to="/settings" className={linkClass('settings')} onClick={closeNav}>{t('nav.settings')}</Link>
        </nav>
        <div className="pd-side-bottom">
          <LanguageToggle className="pd-lang-toggle-side" onChange={handleLanguageSelect} />
          <button onClick={handleLogout} className="pd-signout">{t('nav.signOut')}</button>
        </div>
        <Link to="/help" className="pd-support-link" onClick={closeNav}>{t('nav.helpLink')}</Link>
      </aside>
      <main className={`pd-main${wide ? ' pd-main-wide' : ''}`}>
        {trialCountdown && (
          <div className="pd-trial-banner" role="status">
            <span className="pd-trial-banner-text">
              {trialCountdown.expired
                ? t('nav.trialExpired')
                : t('nav.trialCountdown', {
                    days: trialCountdown.days > 0 ? `${trialCountdown.days}d ` : '',
                    hours: trialCountdown.hours,
                    minutes: trialCountdown.minutes,
                  })}
            </span>
            <Link to="/payment" className="pd-trial-banner-cta" onClick={closeNav}>{t('nav.viewPlans')}</Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
