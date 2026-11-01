import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (err) {
      setError(t('forgotPassword.genericError'));
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
          <h1>{t('forgotPassword.title')}</h1>
          <p>{t('forgotPassword.subtitle')}</p>
        </div>
        {sent ? (
          <div>
            <div className="pd-alert-success">
              {t('forgotPassword.sentMessage', { email })}
            </div>
            <div className="pd-auth-footer">
              <p><Link to="/login">{t('forgotPassword.backToSignIn')}</Link></p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="pd-alert-danger">{error}</div>}
            <div className="pd-field">
              <label htmlFor="forgot-password-email">{t('forgotPassword.emailLabel')}</label>
              <input
                id="forgot-password-email"
                className="pd-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('forgotPassword.emailPlaceholder')}
                required
              />
            </div>
            <button type="submit" className="pd-btn pd-btn-primary pd-btn-block" disabled={loading}>
              {loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
            </button>
            <div className="pd-auth-footer">
              <p><Link to="/login">{t('forgotPassword.backToSignIn')}</Link></p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
