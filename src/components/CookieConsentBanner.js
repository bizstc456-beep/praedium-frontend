import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import '../styles/cookieConsent.css';

// Must match the Measurement ID used in App.js's AnalyticsTracker and in
// public/index.html's gtag stub.
const GA_MEASUREMENT_ID = 'G-8VD7EFE62G';
const CONSENT_KEY = 'pd-cookie-consent';

// Actually turns GA4 on: loads the real gtag.js script and sends the first
// config/pageview. Before this runs, window.gtag() is just a local stub
// (see public/index.html) that queues into dataLayer without ever talking
// to Google or setting a cookie -- so declining really does nothing.
function loadGoogleAnalytics() {
  if (window.__pdGaLoaded) return;
  window.__pdGaLoaded = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
  if (typeof window.gtag === 'function') {
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
  }
}

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(CONSENT_KEY);
    } catch (_) {
      // Private browsing / blocked storage -- fall back to asking every
      // visit rather than silently tracking or silently never tracking.
    }
    if (stored === 'accepted') {
      loadGoogleAnalytics();
    } else if (stored !== 'declined') {
      setVisible(true);
    }
  }, []);

  const choose = (choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch (_) {
      /* best-effort */
    }
    setVisible(false);
    if (choice === 'accepted') loadGoogleAnalytics();
  };

  if (!visible) return null;

  return (
    <div className="pd-cookie-banner" role="dialog" aria-label={t('cookieConsent.ariaLabel')}>
      <p>
        {t('cookieConsent.message')}{' '}
        <Link to="/privacy">{t('cookieConsent.learnMore')}</Link>
      </p>
      <div className="pd-cookie-actions">
        <button type="button" className="pd-cookie-btn pd-cookie-decline" onClick={() => choose('declined')}>
          {t('cookieConsent.decline')}
        </button>
        <button type="button" className="pd-cookie-btn pd-cookie-accept" onClick={() => choose('accepted')}>
          {t('cookieConsent.accept')}
        </button>
      </div>
    </div>
  );
}
