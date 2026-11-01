import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import AppShell from '../components/AppShell';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

const STATUS_META = {
  upcoming: { labelKey: 'leaseRenewals.statusUpcoming', badge: 'neutral' },
  in_window: { labelKey: 'leaseRenewals.statusInWindow', badge: 'warn' },
  window_passed: { labelKey: 'leaseRenewals.statusWindowPassed', badge: 'warn' },
  lease_ended: { labelKey: 'leaseRenewals.statusLeaseEnded', badge: 'good' },
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export default function LeaseRenewalsPage() {
  const { t } = useTranslation();
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('attention'); // 'attention' | 'all'

  const loadRenewals = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) {
        setError(t('leaseRenewals.pleaseLogIn'));
        return;
      }
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/lease-renewals/landlord/${session.user.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('leaseRenewals.loadFailed'));
      setRenewals(data.renewals || []);
    } catch (err) {
      console.error('Error loading lease renewals:', err);
      setError(t('leaseRenewals.loadGenericError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRenewals();
  }, [loadRenewals]);

  const markSent = async (renewal) => {
    setUpdatingId(renewal.tenant_id);
    setError('');
    try {
      const session = await getSession();
      if (!session) {
        setError(t('leaseRenewals.pleaseLogIn'));
        return;
      }
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/tenants/${renewal.tenant_id}/renewal-notice-sent`,
        { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('leaseRenewals.updateFailed'));
      setRenewals((prev) => prev.map((r) =>
        r.tenant_id === renewal.tenant_id ? { ...r, renewal_notice_sent_at: data.tenant.renewal_notice_sent_at } : r
      ));
    } catch (err) {
      setError(err.message || t('leaseRenewals.updateFailed'));
    } finally {
      setUpdatingId(null);
    }
  };

  const undoSent = async (renewal) => {
    setUpdatingId(renewal.tenant_id);
    setError('');
    try {
      const session = await getSession();
      if (!session) {
        setError(t('leaseRenewals.pleaseLogIn'));
        return;
      }
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/tenants/${renewal.tenant_id}/renewal-notice-sent`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('leaseRenewals.updateFailed'));
      setRenewals((prev) => prev.map((r) =>
        r.tenant_id === renewal.tenant_id ? { ...r, renewal_notice_sent_at: null } : r
      ));
    } catch (err) {
      setError(err.message || t('leaseRenewals.updateFailed'));
    } finally {
      setUpdatingId(null);
    }
  };

  const visible = filter === 'attention'
    ? renewals.filter((r) => !r.renewal_notice_sent_at && (r.status === 'in_window' || r.status === 'window_passed'))
    : renewals;

  if (loading) {
    return (
      <AppShell active="renewals">
        <div className="pd-page-header">
          <h1>{t('leaseRenewals.title')}</h1>
        </div>
        <p className="pd-empty">{t('leaseRenewals.loading')}</p>
      </AppShell>
    );
  }

  return (
    <AppShell active="renewals">
      <div className="pd-page-header">
        <h1>{t('leaseRenewals.title')}</h1>
      </div>

      {error && <div className="pd-alert-danger">{error}</div>}

      <div className="pd-card" style={{ marginBottom: 20 }}>
        <div className="pd-range-presets">
          <button
            className={`pd-btn ${filter === 'attention' ? 'pd-btn-primary' : 'pd-btn-secondary'}`}
            onClick={() => setFilter('attention')}
          >
            {t('leaseRenewals.filterNeedsAttention')}
          </button>
          <button
            className={`pd-btn ${filter === 'all' ? 'pd-btn-primary' : 'pd-btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            {t('leaseRenewals.filterAllLeases')}
          </button>
          <span className="pd-info-tip">
            <span className="pd-info-icon">i</span>
            <span className="pd-info-bubble">
              {t('leaseRenewals.noticeWindowTip')}
            </span>
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="pd-empty">
          {renewals.length === 0
            ? t('leaseRenewals.emptyNoneOnFile')
            : t('leaseRenewals.emptyNothingNeedsAttention')}
        </p>
      ) : (
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>{t('leaseRenewals.columnProperty')}</th>
                <th>{t('leaseRenewals.columnTenant')}</th>
                <th>{t('leaseRenewals.columnLeaseEnds')}</th>
                <th>{t('leaseRenewals.columnNoticeWindow')}</th>
                <th>{t('leaseRenewals.columnStatus')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.upcoming;
                return (
                  <tr key={r.tenant_id}>
                    <td>{r.property_address || '—'}</td>
                    <td>{r.tenant_name}{r.unit_label ? ` — ${r.unit_label}` : ''}</td>
                    <td>{formatDate(r.lease_end_date)}</td>
                    <td>
                      {formatDate(r.window_start)} – {formatDate(r.window_end)}
                      <div className="pd-prow-city" style={{ marginTop: 2 }}>{r.bracket}</div>
                    </td>
                    <td><span className={`pd-badge ${meta.badge}`}>{t(meta.labelKey)}</span></td>
                    <td>
                      {r.renewal_notice_sent_at ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="pd-badge good">{t('leaseRenewals.sentOn', { date: formatDate(r.renewal_notice_sent_at) })}</span>
                          <button
                            className="pd-btn pd-btn-secondary"
                            disabled={updatingId === r.tenant_id}
                            onClick={() => undoSent(r)}
                          >
                            {t('leaseRenewals.undo')}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="pd-btn pd-btn-primary"
                          disabled={updatingId === r.tenant_id}
                          onClick={() => markSent(r)}
                        >
                          {updatingId === r.tenant_id ? t('leaseRenewals.saving') : t('leaseRenewals.markNoticeSent')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
