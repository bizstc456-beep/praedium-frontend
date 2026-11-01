import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

// Reached via the link in the "reset your password" email. Supabase parses
// the recovery token out of the URL on load and, once that's done, fires a
// PASSWORD_RECOVERY auth event -- that's our signal that it's safe to show
// the "set a new password" form and call updateUser().
export default function ResetPasswordPage() {
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
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Covers the case where the recovery session was already established
    // (and the event already fired) before this listener attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription?.unsubscribe();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('resetPassword.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordsDontMatch'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // A recovery link can belong to a tenant portal account too --
        // send them to their portal instead of the landlord dashboard.
        let destination = '/';
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const meRes = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tenant-portal/me`, {
            headers: { Authorization: `Bearer ${session?.access_token}` },
          });
          if (meRes.ok) destination = '/tenant';
        } catch (lookupErr) {
          // Not a tenant account (or backend unreachable) -- fall back to '/'.
        }
        setTimeout(() => navigate(destination), 2000);
      }
    } catch (err) {
      setError(t('resetPassword.genericError'));
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
          <h1>{t('resetPassword.title')}</h1>
          <p>{t('resetPassword.subtitle')}</p>
        </div>

        {success ? (
          <div className="pd-auth-footer">{t('resetPassword.successMessage')}</div>
        ) : ready ? (
          <form onSubmit={handleReset}>
            {error && <div className="pd-alert-danger">{error}</div>}
            <div className="pd-field">
              <label htmlFor="reset-password-new">{t('resetPassword.newPasswordLabel')}</label>
              <input
                id="reset-password-new"
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
              <label htmlFor="reset-password-confirm">{t('resetPassword.confirmPasswordLabel')}</label>
              <input
                id="reset-password-confirm"
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
              {loading ? t('resetPassword.updating') : t('resetPassword.updatePassword')}
            </button>
          </form>
        ) : (
          <div>
            <div className="pd-alert-danger">
              {t('resetPassword.linkInvalid')}
            </div>
            <div className="pd-auth-footer">
              <p><Link to="/forgot-password">{t('resetPassword.requestNewLink')}</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
