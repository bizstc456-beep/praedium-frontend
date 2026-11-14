import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

const TIERS = [
  { key: 'starter', price: 39 },
  { key: 'growth', price: 149, featured: true },
  { key: 'portfolio', price: 299 },
];

// The mandatory stop between signup and the dashboard: no sidebar, no way
// to click into app data, nothing to do here but pick a plan and start
// checkout. requireActiveBilling (server.js) would eventually 402 any
// dashboard call anyway, but that's a safety net, not a UI -- this page is
// what actually keeps a new, unpaid landlord out of the product on
// purpose, instead of relying on them to bounce off a blocked API call.
export default function SubscribePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loadingTier, setLoadingTier] = useState(null);

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkStatus = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);
    if (!authUser) {
      setChecking(false);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const data = await apiRequest(
        `${process.env.REACT_APP_BACKEND_URL}/api/billing/plan/${authUser.id}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      // Already has a real subscription (bookmarked this page, finished
      // checkout in another tab, etc.) -- nothing to pick, send them in.
      if (data && data.has_subscription) {
        navigate('/', { replace: true });
        return;
      }
    } catch (err) {
      console.error('Error loading plan on subscribe page:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleCheckout = async (tierKey) => {
    setLoadingTier(tierKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const data = await apiRequest(
        `${process.env.REACT_APP_BACKEND_URL}/api/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tier: tierKey }),
        }
      );

      if (!data.url) {
        throw new Error(t('payment.checkoutSessionFailed'));
      }
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || t('payment.checkoutStartFailed'));
      setLoadingTier(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (checking) {
    return (
      <div className="loading-container"><div className="spinner"></div></div>
    );
  }

  return (
    <div className="pd-subscribe-page">
      <div className="pd-subscribe-brand">Praedium</div>

      <div className="pd-subscribe-panel">
        <div className="pd-pricing-header">
          <h1>{t('subscribe.title')}</h1>
          <p>{t('subscribe.subtitle')}</p>
          {user && <p className="pd-pricing-user">{t('payment.signedInAs', { email: user.email })}</p>}
        </div>

        <div className="pd-subscribe-free-banner">
          <span className="pd-subscribe-free-emoji" role="img" aria-hidden="true">🎉</span>
          <span>
            <strong>{t('subscribe.freeBannerTitle')}</strong> {t('subscribe.freeBannerBody')}
          </span>
        </div>

        <div className="pd-pricing-grid">
          {TIERS.map((tier) => {
            const features = t(`payment.tiers.${tier.key}.features`, { returnObjects: true });
            return (
              <div
                key={tier.key}
                className={`pd-price-card${tier.featured ? ' pd-price-card-featured' : ''}`}
              >
                {tier.featured && <div className="pd-price-ribbon">{t('payment.mostPopular')}</div>}

                <div className="pd-price-row">
                  <h2>{t(`payment.tiers.${tier.key}.name`)}</h2>
                  <div className="pd-price-amount">${tier.price}<span className="period">{t('payment.perMonth')}</span></div>
                </div>
                <p className="pd-price-sub">{t(`payment.tiers.${tier.key}.unitLimit`)} &middot; {t(`payment.tiers.${tier.key}.blurb`)}</p>

                <div className="pd-feature-list">
                  {Array.isArray(features) && features.map((f) => (
                    <div className="pd-feature" key={f}>{f}</div>
                  ))}
                </div>

                <button
                  className="pd-btn pd-btn-primary pd-btn-block"
                  onClick={() => handleCheckout(tier.key)}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === tier.key ? t('payment.processing') : t('payment.startTrial')}
                </button>
              </div>
            );
          })}
        </div>

        <p className="pd-subscribe-footnote">{t('payment.faqCardA')}</p>

        <div className="pd-subscribe-signout">
          <button onClick={handleSignOut}>{t('subscribe.signOut')}</button>
        </div>
      </div>
    </div>
  );
}
