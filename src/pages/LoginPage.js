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
  { auth: { storageKey: 'pd-landlord-auth' } }
);

export default function LoginPage() {
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
      if (error) {
        if (error.message === 'Email not confirmed' || error.code === 'email_not_confirmed') {
          setError(t('login.emailNotConfirmed'));
        } else {
          setError(error.message);
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(t('login.genericError'));
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
          <h1>{t('login.welcomeBack')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>
        <form onSubmit={handleLogin}>
          {error && <div className="pd-alert-danger">{error}</div>}
          <div className="pd-field">
            <label htmlFor="login-email">{t('login.emailLabel')}</label>
            <input
              id="login-email"
              className="pd-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              required
            />
          </div>
          <div className="pd-field">
            <div className="pd-field-label-row">
              <label htmlFor="login-password">{t('login.passwordLabel')}</label>
              <Link to="/forgot-password">{t('login.forgotPassword')}</Link>
            </div>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="pd-btn pd-btn-primary pd-btn-block" disabled={loading}>
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>
        <div className="pd-auth-footer">
          <p>{t('login.noAccount')} <Link to="/register">{t('login.signUp')}</Link></p>
          <p className="pd-auth-support">{t('login.needHelp')} <a href="mailto:support@praedium.pro">{t('login.contactSupport')}</a></p>
        </div>
      </div>
    </div>
  );
}
