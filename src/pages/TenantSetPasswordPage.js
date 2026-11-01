import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-tenant-auth' } }
);

// Reached via the landlord's "invite to portal" email. Supabase's invite
// link, once clicked, establishes a session and fires either SIGNED_IN or
// PASSWORD_RECOVERY depending on flow -- either one means it's safe to show
// the "set a password" form and call updateUser(). Same pattern as the
// landlord ResetPasswordPage, extended to cover both event names.
export default function TenantSetPasswordPage() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    // Covers the case where the session was already established (and the
    // event already fired) before this listener attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription?.unsubscribe();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('tenantSetPassword.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('tenantSetPassword.passwordsDontMatch'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setSuccess(true);
        setTimeout(() => navigate('/tenant'), 2000);
      }
    } catch (err) {
      setError(t('tenantSetPassword.genericError'));
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
          <h1>{t('tenantSetPassword.title')}</h1>
          <p>{t('tenantSetPassword.subtitle')}</p>
        </div>

        {success ? (
          <div className="pd-auth-footer">{t('tenantSetPassword.successMessage')}</div>
        ) : ready ? (
          <form onSubmit={handleSetPassword}>
            {error && <div className="pd-alert-danger">{error}</div>}
            <div className="pd-field">
              <label htmlFor="tenant-set-password-new">{t('tenantSetPassword.newPasswordLabel')}</label>
              <input
                id="tenant-set-password-new"
                className="pd-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="pd-field">
              <label htmlFor="tenant-set-password-confirm">{t('tenantSetPassword.confirmPasswordLabel')}</label>
              <input
                id="tenant-set-password-confirm"
                className="pd-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="pd-btn pd-btn-primary pd-btn-block" disabled={loading}>
              {loading ? t('tenantSetPassword.saving') : t('tenantSetPassword.setPasswordAndContinue')}
            </button>
          </form>
        ) : (
          <div>
            <div className="pd-alert-danger">
              {t('tenantSetPassword.linkInvalid')}
            </div>
            <div className="pd-auth-footer">
              <p>{t('tenantSetPassword.askLandlordToResend')}</p>
              <p><Link to="/tenant/login">{t('tenantSetPassword.backToSignIn')}</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
