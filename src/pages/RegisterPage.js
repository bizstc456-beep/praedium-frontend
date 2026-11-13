import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';
import { apiRequest } from '../utils/api';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

export default function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setConfirmEmailSent(false);

    if (password.length < 6) {
      setError(t('register.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('register.passwordsDontMatch'));
      return;
    }

    if (!agreedToTerms) {
      setError(t('register.mustAgreeToTerms'));
      return;
    }

    setLoading(true);
    try {
      // Registration goes through the backend, not straight to Supabase --
      // this is what also creates the landlord's "customers" record (trial,
      // billing status). A direct supabase.auth.signUp() here would create a
      // login with no customer record behind it, and property creation would
      // fail the moment they tried to add their first building.
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone }),
      });

      // Backend creates the account but doesn't hand back a session --
      // sign in immediately so the new landlord lands straight in the app.
      // When the Supabase project requires email confirmation, this sign-in
      // fails right after every signup with "Email not confirmed" even
      // though the account was created successfully -- show that as the
      // expected next step instead of a scary raw error.
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) {
        if (loginError.message === 'Email not confirmed' || loginError.code === 'email_not_confirmed') {
          setError('');
          setConfirmEmailSent(true);
        } else {
          setError(loginError.message);
        }
      } else {
        // Send the new landlord straight into plan selection + Stripe
        // Checkout instead of the dashboard. There's no free no-card
        // window anymore (see /api/auth/register) -- the first dashboard
        // API call would 402 and bounce them here anyway, so this just
        // skips that extra round trip.
        navigate('/payment');
      }
    } catch (err) {
      setError(err.message || t('register.genericError'));
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
          <h1>{t('register.createAccount')}</h1>
          <p>{t('register.trialSubtitle')}</p>
        </div>
        <form onSubmit={handleRegister}>
          {confirmEmailSent && <div className="pd-alert-success">{t('register.checkEmailToConfirm')}</div>}
          {error && <div className="pd-alert-danger">{error}</div>}
          <div className="pd-field">
            <label htmlFor="register-name">{t('register.fullNameLabel')}</label>
            <input
              id="register-name"
              className="pd-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('register.fullNamePlaceholder')}
              required
            />
          </div>
          <div className="pd-field">
            <label htmlFor="register-phone">{t('register.phoneLabel')}</label>
            <input
              id="register-phone"
              className="pd-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="514-555-0123"
            />
          </div>
          <div className="pd-field">
            <label htmlFor="register-email">{t('register.emailLabel')}</label>
            <input
              id="register-email"
              className="pd-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('register.emailPlaceholder')}
              required
            />
          </div>
          <div className="pd-field">
            <label htmlFor="register-password">{t('register.passwordLabel')}</label>
            <input
              id="register-password"
              className="pd-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="pd-field">
            <label htmlFor="register-confirm-password">{t('register.confirmPasswordLabel')}</label>
            <input
              id="register-confirm-password"
              className="pd-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="pd-field pd-field-checkbox">
            <label className="pd-checkbox-label">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
              />
              <span>
                {t('register.agreeTo')}{' '}
                <Link to="/terms" target="_blank" rel="noopener noreferrer">{t('register.termsOfService')}</Link>
                {' '}{t('register.and')}{' '}
                <Link to="/privacy" target="_blank" rel="noopener noreferrer">{t('register.privacyPolicy')}</Link>
              </span>
            </label>
          </div>
          <button type="submit" className="pd-btn pd-btn-primary pd-btn-block" disabled={loading || !agreedToTerms}>
            {loading ? t('register.creatingAccount') : t('register.signUp')}
          </button>
        </form>
        <div className="pd-auth-footer">
          <p>{t('register.alreadyHaveAccount')} <Link to="/login">{t('register.signIn')}</Link></p>
          <p className="pd-auth-support">{t('register.needHelp')} <a href="mailto:support@praedium.pro">{t('register.contactSupport')}</a></p>
        </div>
      </div>
    </div>
  );
}
