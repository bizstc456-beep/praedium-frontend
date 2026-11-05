import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../utils/api';
import LanguageToggle from '../components/LanguageToggle';
import '../styles/dashboard.css';

// Public page -- reached from the "cancel deletion" link in the
// account-deletion-request email, so it works with no session. The token
// in the URL is the only thing authorizing this (see
// POST /api/account/cancel-deletion on the backend); it's single-use and
// only valid for the 7-day grace period.
export default function CancelDeletionPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('checking'); // checking | success | invalid | expired | error

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/account/cancel-deletion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!cancelled) setStatus('success');
      } catch (err) {
        if (cancelled) return;
        if (err.status === 410) setStatus('expired');
        else if (err.status === 404 || err.status === 400) setStatus('invalid');
        else setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const content = {
    checking: null,
    success: { title: t('cancelDeletion.cancelledTitle'), message: t('cancelDeletion.cancelledMessage'), tone: 'success' },
    invalid: { title: t('cancelDeletion.invalidTitle'), message: t('cancelDeletion.invalidMessage'), tone: 'danger' },
    expired: { title: t('cancelDeletion.expiredTitle'), message: t('cancelDeletion.expiredMessage'), tone: 'danger' },
    error: { title: t('cancelDeletion.invalidTitle'), message: t('cancelDeletion.genericError'), tone: 'danger' },
  }[status];

  return (
    <div className="pd-auth-page">
      <div className="pd-auth-card">
        <div className="pd-auth-top-row">
          <div className="pd-auth-brand">Praedium</div>
          <LanguageToggle />
        </div>
        {status === 'checking' ? (
          <div className="pd-auth-header">
            <p>{t('cancelDeletion.checking')}</p>
          </div>
        ) : (
          <div>
            <div className="pd-auth-header">
              <h1>{content.title}</h1>
            </div>
            <div className={content.tone === 'success' ? 'pd-alert-success' : 'pd-alert-danger'}>
              {content.message}
            </div>
            <div className="pd-auth-footer">
              <p><Link to="/login">{t('cancelDeletion.backToSignIn')}</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
