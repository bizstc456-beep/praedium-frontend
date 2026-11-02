import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';
import LanguagePrompt from './LanguagePrompt';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-tenant-auth' } }
);

// Sidebar layout for the tenant-facing portal -- deliberately separate from
// the landlord AppShell (different nav, different account type). Wrap a
// tenant page's content with <TenantShell active="rental">...</TenantShell>.
export default function TenantShell({ active, children }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);

  // Language preference: sync this device to the tenant's saved choice, or
  // show the first-use prompt once if they've never picked one.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const data = await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/tenant-portal/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!active) return;
        const lang = data.tenant?.preferred_language;
        if (lang) {
          if (i18n.language !== lang) i18n.changeLanguage(lang);
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
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/tenant-portal/language`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ preferred_language: lang }),
      });
    } catch (err) {
      console.error('Error saving language preference:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/tenant/login');
  };

  const linkClass = (page) => (active === page ? 'pd-nav-link current' : 'pd-nav-link');

  return (
    <div className="pd-shell pd-shell-tenant">
      {showLanguagePrompt && <LanguagePrompt onSelect={handleLanguageSelect} />}
      <aside className="pd-side">
        <div className="pd-brand">Praedium</div>
        <nav className="pd-nav">
          <Link to="/tenant" className={linkClass('rental')}>{t('tenantNav.myRental')}</Link>
          <Link to="/tenant/maintenance" className={linkClass('maintenance')}>{t('tenantNav.maintenance')}</Link>
        </nav>
        <div className="pd-side-bottom">
          <LanguageToggle className="pd-lang-toggle-side" onChange={handleLanguageSelect} />
          <button onClick={handleLogout} className="pd-signout">{t('tenantNav.signOut')}</button>
        </div>
        <a href="mailto:support@praedium.pro" className="pd-support-link">{t('tenantNav.helpLink')}</a>
      </aside>
      <main className="pd-main">{children}</main>
      <nav className="pd-tenant-tabbar">
        <Link to="/tenant" className={active === 'rental' ? 'pd-tab current' : 'pd-tab'}>{t('tenantNav.myRental')}</Link>
        <Link to="/tenant/maintenance" className={active === 'maintenance' ? 'pd-tab current' : 'pd-tab'}>{t('tenantNav.maintenance')}</Link>
      </nav>
    </div>
  );
}
