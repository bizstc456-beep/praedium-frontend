import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import AppShell from '../components/AppShell';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

const TIERS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 39,
    unitLimit: '5 units',
    blurb: 'For landlords just getting started.',
    features: [
      'Up to 5 rental units',
      'Payment tracking',
      'SMS notifications',
      'Document storage',
      'AI-powered tenant analysis',
    ],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 149,
    unitLimit: '20 units',
    blurb: 'For landlords scaling their portfolio.',
    featured: true,
    features: [
      'Up to 20 rental units',
      'Everything in Starter',
      'Priority support',
      'Advanced reporting',
    ],
  },
  {
    key: 'portfolio',
    name: 'Portfolio',
    price: 299,
    unitLimit: 'Unlimited units',
    blurb: 'For portfolios and property managers.',
    features: [
      'Unlimited rental units',
      'Everything in Growth',
      'Dedicated onboarding',
    ],
  },
];

export default function PaymentPage() {
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loadingTier, setLoadingTier] = useState(null);
  const [showCancelFeedback, setShowCancelFeedback] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');

  useEffect(() => {
    getUserAndPlan();
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
        alert('Please log in first');
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
        throw new Error(data.error || 'Failed to create checkout session');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleChangePlan = async (tierKey) => {
    const target = TIERS.find((t) => t.key === tierKey);
    if (!window.confirm(`Switch to the ${target?.name} plan? The price difference will be prorated on your next invoice.`)) return;
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
        throw new Error(data.error || 'Failed to switch plans');
      }
      await getUserAndPlan();
    } catch (error) {
      console.error('Change plan error:', error);
      alert(error.message || 'Failed to switch plans. Please try again.');
    } finally {
      setLoadingTier(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      alert('Please choose a reason so we know how to improve.');
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
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      setShowCancelFeedback(false);
      setCancelReason('');
      setCancelFeedback('');
      await getUserAndPlan();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert(error.message || 'Failed to cancel subscription. Please try again.');
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
        throw new Error(data.error || 'Failed to resume subscription');
      }
      await getUserAndPlan();
    } catch (error) {
      console.error('Resume subscription error:', error);
      alert(error.message || 'Failed to resume subscription. Please try again.');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <AppShell active="billing">
      <div className="pd-pricing-wrap pd-pricing-wrap-wide">
        <div className="pd-pricing-header">
          <h1>Praedium Pricing</h1>
          <p>Simple, transparent pricing that grows with your portfolio</p>
          {user && <p className="pd-pricing-user">Signed in as {user.email}</p>}
        </div>

        {plan && plan.has_subscription && (
          <>
            <div className="pd-plan-status">
              <span className={`pd-badge ${plan.subscription_status === 'past_due' ? 'warn' : 'good'}`}>
                {plan.subscription_status === 'trialing' && 'On trial: '}
                {plan.subscription_status === 'past_due' && 'Payment issue: '}
                Current plan: {plan.plan_label}
              </span>
              <span className="pd-plan-usage">
                Using {plan.current_units} {plan.current_units === 1 ? 'unit' : 'units'}
                {plan.max_units != null ? ` of ${plan.max_units}` : ' (unlimited)'}
              </span>
            </div>

            {plan.cancel_at_period_end ? (
              <div className="pd-plan-cancel-notice">
                <span className="pd-badge warn">
                  Cancels on {plan.current_period_end ? new Date(plan.current_period_end).toLocaleDateString() : 'end of billing period'}
                </span>
                <button
                  className="pd-btn pd-btn-secondary"
                  onClick={handleResume}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === 'resume' ? 'Processing...' : 'Resume subscription'}
                </button>
              </div>
            ) : showCancelFeedback ? (
              <div className="pd-cancel-feedback">
                <p className="pd-cancel-feedback-title">Before you go, what's the main reason?</p>
                <div className="pd-field">
                  <label htmlFor="cancel-reason">Reason</label>
                  <select
                    id="cancel-reason"
                    className="pd-select"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    <option value="Too expensive">Too expensive</option>
                    <option value="Missing features I need">Missing features I need</option>
                    <option value="Switching to another tool">Switching to another tool</option>
                    <option value="Not using it enough">Not using it enough</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="pd-field">
                  <label htmlFor="cancel-feedback">Anything you'd like to share? (optional)</label>
                  <textarea
                    id="cancel-feedback"
                    className="pd-textarea"
                    value={cancelFeedback}
                    onChange={(e) => setCancelFeedback(e.target.value)}
                    placeholder="What could we have done better?"
                  />
                </div>
                <div className="pd-cancel-feedback-actions">
                  <button
                    className="pd-btn pd-btn-danger"
                    onClick={handleCancel}
                    disabled={loadingTier !== null}
                  >
                    {loadingTier === 'cancel' ? 'Processing...' : 'Confirm cancellation'}
                  </button>
                  <button
                    className="pd-btn pd-btn-text"
                    onClick={() => { setShowCancelFeedback(false); setCancelReason(''); setCancelFeedback(''); }}
                    disabled={loadingTier !== null}
                  >
                    Never mind
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="pd-btn pd-btn-text pd-cancel-link"
                onClick={() => setShowCancelFeedback(true)}
                disabled={loadingTier !== null}
              >
                Cancel subscription
              </button>
            )}
          </>
        )}

        <div className="pd-trial-badge">30-Day Free Trial on every plan</div>
        <p className="pd-trial-note">Card required to start your trial — you won't be charged for 30 days. Cancel anytime before then and you won't be billed.</p>

        <div className="pd-pricing-grid">
          {TIERS.map((tier) => {
            const isCurrent = plan && plan.has_subscription && plan.plan_tier === tier.key;
            return (
              <div
                key={tier.key}
                className={`pd-price-card${tier.featured ? ' pd-price-card-featured' : ''}${isCurrent ? ' pd-price-card-current' : ''}`}
              >
                {tier.featured && <div className="pd-price-ribbon">Most popular</div>}

                <div className="pd-price-row">
                  <h2>{tier.name}</h2>
                  <div className="pd-price-amount">${tier.price}<span className="period">/month</span></div>
                </div>
                <p className="pd-price-sub">{tier.unitLimit} &middot; {tier.blurb}</p>

                <div className="pd-feature-list">
                  {tier.features.map((f) => (
                    <div className="pd-feature" key={f}>{f}</div>
                  ))}
                </div>

                {isCurrent ? (
                  <button className="pd-btn pd-btn-secondary pd-btn-block" disabled>
                    Your current plan
                  </button>
                ) : (
                  <button
                    className="pd-btn pd-btn-primary pd-btn-block"
                    onClick={() => (plan && plan.has_subscription ? handleChangePlan(tier.key) : handleCheckout(tier.key))} disabled={loadingTier !== null}
                  >
                    {loadingTier === tier.key ? 'Processing...' : (plan && plan.has_subscription) ? `Switch to ${tier.name}` : 'Start 30-Day Free Trial'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="pd-faq">
          <h2>Common questions</h2>
          <div className="pd-faq-item">
            <h3>What counts as a "unit"?</h3>
            <p>Every rental unit across all your properties — a single-family home counts as 1, a duplex as 2, a fourplex as 4, and so on. Your plan is based on your total across your whole portfolio, not the number of properties.</p>
          </div>
          <div className="pd-faq-item">
            <h3>What happens if I go over my plan's limit?</h3>
            <p>You won't be able to add a new property or unit past your plan's cap — you'll be prompted to upgrade first. Your existing data is never affected.</p>
          </div>
          <div className="pd-faq-item">
            <h3>Do I need a credit card for the trial?</h3>
            <p>Yes, we collect your card when you start the trial, but you won't be charged anything for 30 days. Cancel anytime before then and you won't be billed.</p>
          </div>
          <div className="pd-faq-item">
            <h3>Can I change plans later?</h3>
            <p>Yes, you can switch plans anytime from this page. Your access continues until the end of your current billing period.</p>
          </div>
          <div className="pd-faq-item">
            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit and debit cards via Stripe.</p>
          </div>
          <div className="pd-faq-item">
            <h3>What if I need help?</h3>
            <p>
              Email <a href="mailto:support@praedium.pro">support@praedium.pro</a> — it's actively
              monitored, and we aim to respond within 24 hours.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
