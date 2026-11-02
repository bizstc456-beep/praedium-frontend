import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import CountUp from '../components/CountUp';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

// All money from the API is in cents (matches Stripe's convention, used
// consistently for rent_amount and payment amounts alike).
function formatDollars(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${parts[0]},${parts[1]}$`;
}

function formatMoney(cents) {
  return formatDollars((cents || 0) / 100);
}

function shortName(fullName, fallback) {
  if (!fullName) return fallback;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function shortDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// The "Getting started" checklist's dismissal is a per-viewer convenience,
// not data that needs to sync across devices or reappear for other
// landlords -- localStorage is enough, and a bad/blocked store just means
// the checklist shows again, never a broken page.
function onboardingDismissKey(userId) {
  return `rf_onboarding_dismissed_${userId}`;
}

function readOnboardingDismissed(userId) {
  if (!userId) return false;
  try {
    return window.localStorage.getItem(onboardingDismissKey(userId)) === '1';
  } catch {
    return false;
  }
}

export default function LandlordDashboardPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [properties, setProperties] = useState([]);
  const [renewalsSoon, setRenewalsSoon] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [leaseRenewals, setLeaseRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(t('dashboard.pleaseLogInAgain'));
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const base = process.env.REACT_APP_BACKEND_URL;

      setUserId(session.user.id);
      setOnboardingDismissed(readOnboardingDismissed(session.user.id));

      const data = await apiRequest(`${base}/api/dashboard/${session.user.id}`, { headers });

      setSummary(data.summary);
      setProperties(data.properties || []);
      setRenewalsSoon(data.renewals_soon || []);
      setTenants(data.tenants || []);
      setPayments(data.payments || []);

      // Right-rail widgets are fetched separately and never block the core
      // dashboard from rendering, even if one of them is slow or fails.
      apiRequest(`${base}/api/maintenance/landlord/${session.user.id}`, { headers })
        .then((d) => setMaintenanceRequests(d.requests || []))
        .catch(() => { });

      apiRequest(`${base}/api/lease-renewals/landlord/${session.user.id}`, { headers })
        .then((d) => setLeaseRenewals(d.renewals || []))
        .catch(() => { });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="pd-state"><p>{t('dashboard.loadingMessage')}</p></div>;
  }

  if (error) {
    return <div className="pd-state"><p>{error}</p></div>;
  }

  const hasPending = summary.pending_amount > 0;
  const hasRenewals = renewalsSoon.length > 0;
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const tenantNameById = {};
  tenants.forEach((tn) => { tenantNameById[tn.id] = tn.name; });

  const paymentActivity = payments
    .filter((p) => p.status === 'paid')
    .map((p) => ({
      key: `payment-${p.id}`,
      dot: 'good',
      text: t('dashboard.paymentActivityText', {
        name: shortName(tenantNameById[p.tenant_id], t('dashboard.tenantFallback')),
        amount: formatMoney(p.amount),
      }),
      date: p.payment_date || p.created_at,
    }));

  const maintenanceActivity = maintenanceRequests.map((r) => ({
    key: `maint-${r.id}`,
    dot: 'accent',
    text: t('dashboard.maintenanceActivityText', {
      address: r.properties?.address || t('dashboard.propertyFallback'),
    }),
    date: r.created_at,
  }));

  const recentActivity = [...paymentActivity, ...maintenanceActivity]
    .filter((a) => a.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const openMaintenance = maintenanceRequests.filter(
    (r) => r.status === 'open' || r.status === 'in_progress'
  );
  const maintenancePreview = openMaintenance.slice(0, 2);

  const renewalPreview = leaseRenewals
    .filter((r) => r.status === 'in_window' || r.status === 'upcoming')
    .slice(0, 2);

  // "Getting started" checklist -- driven by real data, not its own tracked
  // state, so it never drifts from what the account has actually done.
  // The payment step only sees this month's payments (the dashboard doesn't
  // fetch full history), which is a fine trade-off for an onboarding aid
  // aimed at brand-new accounts.
  // Once a property exists, point the "add tenant" step straight at that
  // property's add-tenant form (PropertiesPage opens it from ?addTenant=<id>)
  // instead of just the plain properties list.
  const firstPropertyId = properties[0]?.id;
  const addTenantTo = firstPropertyId ? `/properties?addTenant=${firstPropertyId}` : '/properties';

  // Once there's a tenant with no payment recorded this month, point the
  // "record payment" step at that tenant's payment form (?recordPayment=<id>)
  // rather than the plain list -- falls back to the first tenant if every
  // tenant already looks paid (e.g. this month's payments data is still
  // loading), since the step wouldn't show as "current" anyway once done.
  const paidTenantIds = new Set(payments.filter((p) => p.status === 'paid').map((p) => p.tenant_id));
  const unpaidTenant = tenants.find((tn) => !paidTenantIds.has(tn.id)) || tenants[0];
  const recordPaymentTo = unpaidTenant ? `/properties?recordPayment=${unpaidTenant.id}` : '/properties';

  const onboardingSteps = [
    {
      key: 'property',
      label: t('dashboard.onboardingAddProperty'),
      done: properties.length > 0,
      cta: t('dashboard.onboardingAddPropertyCta'),
      to: '/properties?new=1',
    },
    {
      key: 'tenant',
      label: t('dashboard.onboardingAddTenant'),
      done: tenants.length > 0,
      cta: t('dashboard.onboardingAddTenantCta'),
      to: addTenantTo,
    },
    {
      key: 'payment',
      label: t('dashboard.onboardingRecordPayment'),
      done: (summary.total_collected_this_month || 0) > 0,
      cta: t('dashboard.onboardingRecordPaymentCta'),
      to: recordPaymentTo,
    },
  ];
  const onboardingDoneCount = onboardingSteps.filter((s) => s.done).length;
  const showOnboarding = onboardingDoneCount < onboardingSteps.length && !onboardingDismissed;

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    try {
      window.localStorage.setItem(onboardingDismissKey(userId), '1');
    } catch {
      // Best-effort -- worst case the checklist reappears next visit.
    }
  };

  return (
    <div className="pd-dash">
      <div className="pd-dash-grid">
        <div className="pd-dash-main">
          {showOnboarding && (
            <div className="pd-onboarding pd-anim-in">
              <div className="pd-onboarding-head">
                <div className="pd-onboarding-title">
                  <span>{t('dashboard.gettingStarted')}</span>
                  <span className="pd-onboarding-progress">{t('dashboard.onboardingProgress', { done: onboardingDoneCount, total: onboardingSteps.length })}</span>
                </div>
                <button
                  type="button"
                  className="pd-onboarding-close"
                  onClick={dismissOnboarding}
                  aria-label={t('dashboard.dismissOnboardingAriaLabel')}
                >
                  &times;
                </button>
              </div>
              <div className="pd-onboarding-steps">
                {(() => {
                  const firstIncompleteIndex = onboardingSteps.findIndex((s) => !s.done);
                  return onboardingSteps.map((step, i) => {
                    const isCurrent = i === firstIncompleteIndex;
                    return (
                      <div
                        className={`pd-onboarding-step ${step.done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                        key={step.key}
                      >
                        <div className="pd-onboarding-step-left">
                          <span className="pd-onboarding-check">{step.done ? '✓' : ''}</span>
                          <span className="pd-onboarding-label">{step.label}</span>
                        </div>
                        {isCurrent && (
                          <Link to={step.to} className="pd-onboarding-cta">{step.cta} &rarr;</Link>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          <p className="pd-greet">{t('dashboard.greetOverview', { month: monthLabel })}</p>

          <div className="pd-hero">
            <span className="pd-hero-num">
              <CountUp
                value={(summary.total_collected_this_month || 0) / 100}
                format={(n) => formatDollars(n)}
              />
            </span>
            <span className="pd-hero-label">{t('dashboard.collectedThisMonth')}</span>
          </div>

          <div className="pd-chips">
            <div className="pd-chip">
              <b><CountUp value={summary.total_properties} /></b>
              <span>{t('dashboard.chipProperties')}</span>
            </div>
            <div className="pd-chip">
              <b><CountUp value={summary.total_tenants} /></b>
              <span>{t('dashboard.chipTenants')}</span>
            </div>
            <div className="pd-chip">
              <b>
                <CountUp
                  value={(summary.pending_amount || 0) / 100}
                  format={(n) => formatDollars(n)}
                />
              </b>
              <span>{t('dashboard.chipPending')}</span>
            </div>
          </div>

          {hasPending && (
            <div className="pd-banner">
              <div>
                <div className="pd-banner-title">{t('dashboard.bannerPendingTitle', { amount: formatMoney(summary.pending_amount) })}</div>
                <div className="pd-banner-sub">{t('dashboard.bannerPendingSub')}</div>
              </div>
              <Link to="/messages" className="pd-banner-btn">{t('dashboard.goToMessages')}</Link>
            </div>
          )}

          {hasRenewals && (
            <div className="pd-banner">
              <div>
                <div className="pd-banner-title">
                  {t('dashboard.bannerRenewalTitle', { count: renewalsSoon.length })}
                </div>
                <div className="pd-banner-sub">
                  {t('dashboard.bannerRenewalSub', { names: renewalsSoon.map((tn) => tn.name).join(', ') })}
                </div>
              </div>
              <Link to="/properties" className="pd-banner-btn">{t('dashboard.goToProperties')}</Link>
            </div>
          )}

          <div className="pd-page-header-row">
            <h2 className="pd-section-title" style={{ margin: 0 }}>{t('dashboard.yourPropertiesTitle')}</h2>
            <Link to="/properties" className="pd-btn pd-btn-secondary">{t('dashboard.managePropertiesCta')}</Link>
          </div>

          {properties.length === 0 ? (
            <p className="pd-empty">
              {t('dashboard.noPropertiesPrefix')} <Link to="/properties">{t('dashboard.noPropertiesLinkText')}</Link> {t('dashboard.noPropertiesSuffix')}
            </p>
          ) : (
            <div className="pd-plist">
              {properties.map((p) => {
                const unitCount = (p.tenants || []).length;
                return (
                  <div className="pd-prow" key={p.id}>
                    <div>
                      <div className="pd-prow-addr">{p.address}</div>
                      <div className="pd-prow-city">
                        {p.city}{unitCount ? ` · ${t('dashboard.unitCount', { count: unitCount })}` : ''}
                      </div>
                    </div>
                    <div className="pd-prow-rent">{t('dashboard.perMonth', { amount: formatMoney(p.collected_this_month + p.pending_amount) })}</div>
                    <span className={`pd-dot-status ${p.status === 'paid' ? 'good' : 'warn'}`}>
                      {p.status === 'paid' ? t('dashboard.statusPaid') : t('dashboard.statusPendingAmount', { amount: formatMoney(p.pending_amount) })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pd-rail">
          {properties.length > 0 && (
            <div className="pd-rail-card pd-anim-in" style={{ animationDelay: '0ms' }}>
              <div className="pd-rail-card-title">{t('dashboard.quickActionsTitle')}</div>
              <div className="pd-quick-actions">
                <Link to="/properties?new=1" className="pd-quick-action">{t('dashboard.quickActionAddProperty')}</Link>
                <Link to="/properties" className="pd-quick-action">{t('dashboard.quickActionRecordPayment')}</Link>
                <Link to="/properties" className="pd-quick-action">{t('dashboard.quickActionInviteTenant')}</Link>
                <Link to="/reports?new=1" className="pd-quick-action">{t('dashboard.quickActionLogExpense')}</Link>
              </div>
            </div>
          )}

          {properties.length === 0 ? (
            <div className="pd-rail-card pd-anim-in" style={{ animationDelay: '70ms' }}>
              <div className="pd-rail-card-title">{t('dashboard.emptyRailTitle')}</div>
              <p className="pd-rail-empty">{t('dashboard.emptyRailNote')}</p>
            </div>
          ) : (
            <>
              <div className="pd-rail-card pd-anim-in" style={{ animationDelay: '70ms' }}>
                <div className="pd-rail-card-title">{t('dashboard.recentActivityTitle')}</div>
                {recentActivity.length === 0 ? (
                  <p className="pd-rail-empty">{t('dashboard.recentActivityEmpty')}</p>
                ) : (
                  <div className="pd-activity-list">
                    {recentActivity.map((a) => (
                      <div className="pd-activity-row" key={a.key}>
                        <span className={`pd-activity-dot ${a.dot}`} />
                        <span className="pd-activity-text">{a.text}</span>
                        <span className="pd-activity-date">{shortDate(a.date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pd-rail-card pd-anim-in" style={{ animationDelay: '140ms' }}>
                <div className="pd-rail-card-head">
                  <span className="pd-rail-card-title">{t('dashboard.maintenanceTitle')}</span>
                  <Link to="/maintenance" className="pd-rail-view-all">{t('dashboard.viewAll')}</Link>
                </div>
                <div className="pd-rail-count">
                  <b>{openMaintenance.length}</b>
                  <span>{t('dashboard.openRequestsCount', { count: openMaintenance.length })}</span>
                </div>
                {maintenancePreview.length === 0 ? (
                  <p className="pd-rail-empty">{t('dashboard.maintenanceEmptyNow')}</p>
                ) : (
                  <div className="pd-rail-mini-list">
                    {maintenancePreview.map((r) => (
                      <div className="pd-rail-mini-row" key={r.id}>
                        <span>{r.title}{r.tenants?.unit_label ? ` — ${r.tenants.unit_label}` : ''}</span>
                        <span className={`pd-badge ${r.status === 'open' ? 'warn pd-badge-pulse' : 'neutral'}`}>
                          {r.status === 'open' ? t('dashboard.maintenanceStatusOpen') : t('dashboard.maintenanceStatusInProgress')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pd-rail-card pd-anim-in" style={{ animationDelay: '210ms' }}>
                <div className="pd-rail-card-head">
                  <span className="pd-rail-card-title">{t('dashboard.leaseRenewalsTitle')}</span>
                  <Link to="/renewals" className="pd-rail-view-all">{t('dashboard.viewAll')}</Link>
                </div>
                {renewalPreview.length === 0 ? (
                  <p className="pd-rail-empty">{t('dashboard.leaseRenewalsEmpty')}</p>
                ) : (
                  <div className="pd-rail-mini-list">
                    {renewalPreview.map((r) => (
                      <div className="pd-rail-mini-row" key={r.tenant_id}>
                        <span>{t('dashboard.leaseRenewalRow', { name: shortName(r.tenant_name, t('dashboard.tenantFallback')), date: shortDate(r.lease_end_date) })}</span>
                        <span className={`pd-badge ${r.status === 'in_window' ? 'warn' : 'muted'}`}>
                          {r.status === 'in_window' ? t('dashboard.renewalStatusWindowOpen') : t('dashboard.renewalStatusUpcoming')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
