import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import AppShell from '../components/AppShell';

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

export default function PaymentPage() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loadingTier, setLoadingTier] = useState(null);
  const [showCancelFeedback, setShowCancelFeedback] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');

  useEffect(() => {
    getUserAndPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUserAndPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/billing/plan/${user.id}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      const data = await res.json();
      if (res.ok) setPlan(data);
    } catch (err) {
      console.error('Error loading plan:', err);
    }
  };

  const handleCheckout = async (tierKey) => {
    setLoadingTier(tierKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(t('payment.pleaseLogInFirst'));
        return;
      }

      // The backend derives the user from this session token rather than
      // trusting the body, and maps `tier` server-side to the matching
      // Stripe price id -- the frontend never sends a price id directly.
      const response = await fetch(
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

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || t('payment.checkoutSessionFailed'));
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || t('payment.checkoutStartFailed'));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleChangePlan = async (tierKey) => {
    const target = TIERS.find((tr) => tr.key === tierKey);
    const planName = target ? t(`payment.tiers.${target.key}.name`) : '';
    if (!window.confirm(t('payment.confirmSwitchPlan', { planName }))) return;
    setLoadingTier(tierKey);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/billing/change-plan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tier: tierKey }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('payment.switchPlanFailed'));
      }
      await getUserAndPlan();
    } catch (error) {
      console.error('Change plan error:', error);
      alert(error.message || t('payment.switchPlanRetry'));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      alert(t('payment.chooseReasonPrompt'));
      return;
    }
    setLoadingTier('cancel');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/billing/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: cancelReason, feedback: cancelFeedback }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('payment.cancelFailed'));
      }
      setShowCancelFeedback(false);
      setCancelReason('');
      setCancelFeedback('');
      await getUserAndPlan();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert(error.message || t('payment.cancelRetry'));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleResume = async () => {
    setLoadingTier('resume');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/billing/resume`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('payment.resumeFailed'));
      }
      await getUserAndPlan();
    } catch (error) {
      console.error('Resume subscription error:', error);
      alert(error.message || t('payment.resumeRetry'));
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <AppShell active="billing">
      <div className="pd-pricing-wrap pd-pricing-wrap-wide">
        <div className="pd-pricing-header">
          <h1>{t('payment.pageTitle')}</h1>
          <p>{t('payment.pageSubtitle')}</p>
          {user && <p className="pd-pricing-user">{t('payment.signedInAs', { email: user.email })}</p>}
        </div>

        {plan && plan.has_subscription && (
          <>
            <div className="pd-plan-status">
              <span className={`pd-badge ${plan.subscription_status === 'past_due' ? 'warn' : 'good'}`}>
                {plan.subscription_status === 'trialing' && t('payment.onTrialPrefix')}
                {plan.subscription_status === 'past_due' && t('payment.paymentIssuePrefix')}
                {t('payment.currentPlanLabel', { planLabel: plan.plan_label })}
              </span>
              <span className="pd-plan-usage">
                {t('payment.usingUnits', { count: plan.current_units })}
                {plan.max_units != null ? t('payment.ofMax', { max: plan.max_units }) : t('payment.unlimitedSuffix')}
              </span>
            </div>

            {plan.cancel_at_period_end ? (
              <div className="pd-plan-cancel-notice">
                <span className="pd-badge warn">
                  {t('payment.cancelsOnDate', {
                    date: plan.current_period_end
                      ? new Date(plan.current_period_end).toLocaleDateString()
                      : t('payment.endOfBillingPeriod'),
                  })}
                </span>
                <button
                  className="pd-btn pd-btn-secondary"
                  onClick={handleResume}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === 'resume' ? t('payment.processing') : t('payment.resumeSubscription')}
                </button>
              </div>
            ) : showCancelFeedback ? (
              <div className="pd-cancel-feedback">
                <p className="pd-cancel-feedback-title">{t('payment.cancelFeedbackTitle')}</p>
                <div className="pd-field">
                  <label htmlFor="cancel-reason">{t('payment.reasonLabel')}</label>
                  <select
                    id="cancel-reason"
                    className="pd-select"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  >
                    <option value="">{t('payment.selectReasonPlaceholder')}</option>
                    <option value="Too expensive">{t('payment.reasonTooExpensive')}</option>
                    <option value="Missing features I need">{t('payment.reasonMissingFeatures')}</option>
                    <option value="Switching to another tool">{t('payment.reasonSwitchingTool')}</option>
                    <option value="Not using it enough">{t('payment.reasonNotUsingEnough')}</option>
                    <option value="Other">{t('payment.reasonOther')}</option>
                  </select>
                </div>
                <div className="pd-field">
                  <label htmlFor="cancel-feedback">{t('payment.feedbackLabel')}</label>
                  <textarea
                    id="cancel-feedback"
                    className="pd-textarea"
                    value={cancelFeedback}
                    onChange={(e) => setCancelFeedback(e.target.value)}
                    placeholder={t('payment.feedbackPlaceholder')}
                  />
                </div>
                <div className="pd-cancel-feedback-actions">
                  <button
                    className="pd-btn pd-btn-danger"
                    onClick={handleCancel}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === 'cancel' ? t('payment.processing') : t('payment.confirmCancellation')}
                  </button>
                  <button
                    className="pd-btn pd-btn-text"
                    onClick={() => { setShowCancelFeedback(false); setCancelReason(''); setCancelFeedback(''); }}
                    disabled={loadingTier !== null}
                  >
                    {t('payment.neverMind')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="pd-btn pd-btn-text pd-cancel-link"
                onClick={() => setShowCancelFeedback(true)}
                disabled={loadingTier !== null}
              >
                {t('payment.cancelSubscription')}
              </button>
            )}
          </>
        )}

        <div className="pd-trial-badge">{t('payment.trialBadge')}</div>
        <p className="pd-trial-note">{t('payment.trialNote')}</p>

        <div className="pd-pricing-grid">
          {TIERS.map((tier) => {
            const isCurrent = plan && plan.has_subscription && plan.plan_tier === tier.key;
            const features = t(`payment.tiers.${tier.key}.features`, { returnObjects: true });
            return (
              <div
                key={tier.key}
                className={`pd-price-card${tier.featured ? ' pd-price-card-featured' : ''}${isCurrent ? ' pd-price-card-current' : ''}`}
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

                {isCurrent ? (
                  <button className="pd-btn pd-btn-secondary pd-btn-block" disabled>
                    {t('payment.yourCurrentPlan')}
                  </button>
                ) : (
                  <button
                    className="pd-btn pd-btn-primary pd-btn-block"
                    onClick={() => (plan && plan.has_subscription ? handleChangePlan(tier.key) : handleCheckout(tier.key))} disabled={loadingTier !== null}
                  >
                    {loadingTier === tier.key
                      ? t('payment.processing')
                      : (plan && plan.has_subscription)
                        ? t('payment.switchToPlan', { planName: t(`payment.tiers.${tier.key}.name`) })
                        : t('payment.startTrial')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="pd-faq">
          <h2>{t('payment.faqTitle')}</h2>
          <div className="pd-faq-item">
            <h3>{t('payment.faqUnitQ')}</h3>
            <p>{t('payment.faqUnitA')}</p>
          </div>
          <div className="pd-faq-item">
            <h3>{t('payment.faqOverLimitQ')}</h3>
            <p>{t('payment.faqOverLimitA')}</p>
          </div>
          <div className="pd-faq-item">
            <h3>{t('payment.faqCardQ')}</h3>
            <p>{t('payment.faqCardA')}</p>
          </div>
          <div className="pd-faq-item">
            <h3>{t('payment.faqChangeQ')}</h3>
            <p>{t('payment.faqChangeA')}</p>
          </div>
          <div className="pd-faq-item">
            <h3>{t('payment.faqMethodsQ')}</h3>
            <p>{t('payment.faqMethodsA')}</p>
          </div>
          <div className="pd-faq-item">
            <h3>{t('payment.faqHelpQ')}</h3>
            <p>
              {t('payment.faqHelpPrefix')}<a href="mailto:support@praedium.pro">support@praedium.pro</a>{t('payment.faqHelpSuffix')}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
