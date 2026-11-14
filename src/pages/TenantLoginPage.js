import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';
import PasswordInput from '../components/PasswordInput';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-tenant-auth' } }
);

export default function TenantLoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate('/tenant');
    } catch (err) {
      setError(t('tenantLogin.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pd-auth-page">
      <div className="pd-auth-card">
        <div className="pd-auth-top-row">
          <div className="pd-auth-brand">Praedium</div>
          <LanguageToggle />
        </div>
        <div className="pd-auth-header">
          <h1>{t('tenantLogin.title')}</h1>
          <p>{t('tenantLogin.subtitle')}</p>
        </div>
        <form onSubmit={handleLogin}>
          {error && <div className="pd-alert-danger">{error}</div>}
          <div className="pd-field">
            <label htmlFor="tenant-login-email">{t('tenantLogin.emailLabel')}</label>
            <input
              id="tenant-login-email"
              className="pd-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('tenantLogin.emailPlaceholder')}
              required
            />
          </div>
          <div className="pd-field">
            <div className="pd-field-label-row">
              <label htmlFor="tenant-login-password">{t('tenantLogin.passwordLabel')}</label>
              <Link to="/forgot-password">{t('tenantLogin.forgotPassword')}</Link>
            </div>
            <PasswordInput
              id="tenant-login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="pd-btn pd-btn-primary pd-btn-block" disabled={loading}>
            {loading ? t('tenantLogin.signingIn') : t('tenantLogin.signIn')}
          </button>
        </form>
        <div className="pd-auth-footer">
          <p>{t('tenantLogin.newHere')}</p>
          <p className="pd-auth-support">{t('tenantLogin.needHelp')} <a href="mailto:support@praedium.pro">{t('tenantLogin.contactSupport')}</a></p>
        </div>
      </div>
    </div>
  );
}
