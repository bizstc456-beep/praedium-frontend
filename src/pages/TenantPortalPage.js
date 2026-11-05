import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import TenantShell from '../components/TenantShell';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-tenant-auth' } }
);

function formatMoney(cents) {
  const amount = (cents || 0) / 100;
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${parts[0]},${parts[1]}$`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function TenantPortalPage() {
  const { t } = useTranslation();
  const [tenant, setTenant] = useState(null);
  const [property, setProperty] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError(t('tenantPortal.pleaseLogIn'));
        return;
      }
      const backend = process.env.REACT_APP_BACKEND_URL;
      const authHeaders = { Authorization: `Bearer ${session.access_token}` };

      const [meData, paymentsData] = await Promise.all([
        apiRequest(`${backend}/api/tenant-portal/me`, { headers: authHeaders }),
        apiRequest(`${backend}/api/tenant-portal/payments`, { headers: authHeaders }),
      ]);

      setTenant(meData.tenant);
      setProperty(meData.property);
      setPayments(paymentsData.payments || []);
    } catch (err) {
      console.error('Error loading tenant portal:', err);
      setError(err.message || t('tenantPortal.loadGenericError'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <TenantShell active="rental">
        <div className="pd-page-header">
          <h1>{t('tenantPortal.title')}</h1>
        </div>
        <p className="pd-empty">{t('tenantPortal.loading')}</p>
      </TenantShell>
    );
  }

  return (
    <TenantShell active="rental">
      <div className="pd-page-header">
        <h1>{t('tenantPortal.title')}</h1>
        <p>{property ? property.address : t('tenantPortal.subtitleFallback')}</p>
      </div>

      {error && <div className="pd-alert-danger">{error}</div>}
      {tenant && (
        <>
          <div className="pd-chips">
            <div className="pd-chip"><b>{formatMoney(tenant.rent_amount)}</b><span>{t('tenantPortal.monthlyRent')}</span></div>

            <div className="pd-chip"><b>{formatDate(tenant.lease_end_date)}</b><span>{t('tenantPortal.leaseEnds')}</span></div>
          </div>

          <div className="pd-card" style={{ marginBottom: 24 }}>
            <h2 className="pd-section-title">{t('tenantPortal.leaseDetailsTitle')}</h2>
            <div className="pd-prow-city">
              {t('tenantPortal.unitLabel')}: {tenant.unit_label || '—'}<br />
              {t('tenantPortal.leaseStartLabel')}: {formatDate(tenant.lease_start_date)}<br />
              {t('tenantPortal.leaseEndLabel')}: {formatDate(tenant.lease_end_date)}
            </div>
          </div>

          {(tenant.lowest_rent_disclosed_amount || tenant.lowest_rent_disclosure_note) && (
            <div className="pd-card" style={{ marginBottom: 24 }}>
              <h2 className="pd-section-title">{t('tenantPortal.rentHistoryTitle')}</h2>
              <div className="pd-prow-city">
                {tenant.lowest_rent_disclosed_amount ? (
                  <>{t('tenantPortal.rentHistoryAmountLabel')}: {formatMoney(tenant.lowest_rent_disclosed_amount)}<br /></>
                ) : null}
                {tenant.lowest_rent_disclosure_note ? (
                  <>{t('tenantPortal.rentHistoryNoteLabel')}: {tenant.lowest_rent_disclosure_note}</>
                ) : null}
              </div>
            </div>
          )}

          <h2 className="pd-section-title">{t('tenantPortal.paymentHistoryTitle')}</h2>
          {payments.length === 0 ? (
            <p className="pd-empty">{t('tenantPortal.noPayments')}</p>
          ) : (
            <div className="pd-table-wrap">
              <table className="pd-table pd-table-stack">
                <thead>
                  <tr>
                    <th>{t('tenantPortal.columnDate')}</th>
                    <th>{t('tenantPortal.columnAmount')}</th>
                    <th>{t('tenantPortal.columnMethod')}</th>
                    <th>{t('tenantPortal.columnStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td data-label={t('tenantPortal.columnDate')}>{formatDate(p.payment_date || p.created_at)}</td>
                      <td data-label={t('tenantPortal.columnAmount')}>{formatMoney(p.amount)}</td>
                      <td data-label={t('tenantPortal.columnMethod')}>{p.payment_method || '-'}</td>
                      <td data-label={t('tenantPortal.columnStatus')}>
                        <span className={`pd-badge ${p.status === 'paid' ? 'good' : 'warn'}`}>
                          {p.status === 'paid' ? t('tenantPortal.statusPaid') : p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </TenantShell>
  );
}
