import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import AppShell from '../components/AppShell';
import { apiRequest } from '../utils/api';
import { formatUnitLabel } from '../utils/formatUnitLabel';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

const STATUSES = [
  { value: 'open', badge: 'warn' },
  { value: 'in_progress', badge: 'neutral' },
  { value: 'resolved', badge: 'good' },
];

// Keep in sync with VENDOR_TRADES in the backend.
const VENDOR_TRADES = [
  'general',
  'plumbing',
  'electrical',
  'hvac',
  'cleaning',
  'landscaping',
  'pest_control',
  'locksmith',
  'other',
];

const EMPTY_VENDOR = { trade: 'general', name: '', phone: '', email: '' };

function statusMeta(value) {
  return STATUSES.find((s) => s.value === value) || STATUSES[0];
}

function tradeLabel(value, t) {
  const trade = VENDOR_TRADES.includes(value) ? value : 'general';
  return t(`maintenance.trade.${trade}`);
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 2h2.2l1 2.8-1.4 1.2a8 8 0 0 0 3.7 3.7l1.2-1.4 2.8 1v2.2c0 .8-.7 1.4-1.5 1.3A11 11 0 0 1 2.2 3.5C2.1 2.7 2.7 2 3.5 2Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="m2.5 4.5 5.5 4 5.5-4" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2.5 13.5 5 5.5 13H3v-2.5L11 2.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5 5 13a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-8.5" />
    </svg>
  );
}

export default function MaintenancePage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [assigningVendorId, setAssigningVendorId] = useState(null);
  const [filter, setFilter] = useState('open'); // 'open' | 'all'

  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorError, setVendorError] = useState('');
  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(EMPTY_VENDOR);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [savingVendor, setSavingVendor] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) {
        setError(t('maintenance.pleaseLogInAgain'));
        return;
      }
      const data = await apiRequest(
        `${process.env.REACT_APP_BACKEND_URL}/api/maintenance/landlord/${session.user.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading maintenance requests:', err);
      setError(err.message || t('maintenance.loadRequestsError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) return;
      const data = await apiRequest(
        `${process.env.REACT_APP_BACKEND_URL}/api/vendors/${session.user.id}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setVendors(data.vendors || []);
    } catch (err) {
      console.error('Error loading vendors:', err);
      setVendorError(err.message || t('maintenance.loadVendorsError'));
    } finally {
      setVendorsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRequests();
    loadVendors();
  }, [loadRequests, loadVendors]);

  const updateStatus = async (request, status) => {
    setUpdatingId(request.id);
    setError('');
    try {
      const session = await getSession();
      if (!session) {
        setError(t('maintenance.pleaseLogInAgain'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/maintenance/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      });
      setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status } : r)));
    } catch (err) {
      setError(err.message || t('maintenance.updateRequestError'));
    } finally {
      setUpdatingId(null);
    }
  };

  const assignVendor = async (request, vendorId) => {
    setAssigningVendorId(request.id);
    setError('');
    try {
      const session = await getSession();
      if (!session) {
        setError(t('maintenance.pleaseLogInAgain'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/maintenance/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: request.status, vendor_id: vendorId || null }),
      });
      const assignedVendor = vendorId ? vendors.find((v) => v.id === vendorId) || null : null;
      setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, vendor_id: vendorId || null, vendors: assignedVendor } : r)));
    } catch (err) {
      setError(err.message || t('maintenance.updateVendorAssignmentError'));
    } finally {
      setAssigningVendorId(null);
    }
  };

  const openAddVendor = () => {
    setVendorError('');
    setEditingVendorId(null);
    setVendorForm(EMPTY_VENDOR);
    setVendorFormOpen(true);
  };

  const openEditVendor = (vendor) => {
    setVendorError('');
    setEditingVendorId(vendor.id);
    setVendorForm({ trade: vendor.trade, name: vendor.name, phone: vendor.phone, email: vendor.email || '' });
    setVendorFormOpen(true);
  };

  const closeVendorForm = () => {
    setVendorFormOpen(false);
    setEditingVendorId(null);
    setVendorError('');
  };

  const submitVendor = async (e) => {
    e.preventDefault();
    setVendorError('');

    if (!vendorForm.name.trim()) {
      setVendorError(t('maintenance.enterName'));
      return;
    }
    if (!vendorForm.phone.trim()) {
      setVendorError(t('maintenance.enterPhone'));
      return;
    }

    setSavingVendor(true);
    try {
      const session = await getSession();
      if (!session) {
        setVendorError(t('maintenance.pleaseLogInAgain'));
        return;
      }
      const url = editingVendorId
        ? `${process.env.REACT_APP_BACKEND_URL}/api/vendors/${editingVendorId}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/vendors`;
      await apiRequest(url, {
        method: editingVendorId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(vendorForm),
      });
      closeVendorForm();
      await loadVendors();
    } catch (err) {
      setVendorError(err.message || t('maintenance.saveVendorError'));
    } finally {
      setSavingVendor(false);
    }
  };

  const deleteVendor = async (vendor) => {
    if (!window.confirm(t('maintenance.confirmRemoveVendor', { name: vendor.name }))) return;
    setVendorError('');
    try {
      const session = await getSession();
      if (!session) {
        setVendorError(t('maintenance.pleaseLogInAgain'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/vendors/${vendor.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await loadVendors();
    } catch (err) {
      setVendorError(err.message || t('maintenance.deleteVendorError'));
    }
  };

  const visibleRequests = filter === 'open'
    ? requests.filter((r) => r.status !== 'resolved')
    : requests;

  const vendorsPanel = (
    <div className="pd-card pd-vend-card">
      <div className="pd-vend-head">
        <div className="pd-vend-title">{t('maintenance.yourVendorsTitle')}</div>
        <p className="pd-vend-sub">{t('maintenance.yourVendorsSub')}</p>
      </div>

      {vendorError && <div className="pd-alert-danger" style={{ marginBottom: 12 }}>{vendorError}</div>}

      {vendorsLoading ? (
        <p className="pd-empty" style={{ padding: '12px 0' }}>{t('maintenance.loading')}</p>
      ) : vendors.length === 0 && !vendorFormOpen ? (
        <p className="pd-empty" style={{ padding: '12px 0' }}>
          {t('maintenance.noVendorsYet')}
        </p>
      ) : (
        <div className="pd-vend-list">
          {vendors.map((v) => (
            <div className="pd-vend-row" key={v.id}>
              <div className="pd-vend-row-main">
                <div className="pd-vend-row-top">
                  <span className="pd-vend-name">{v.name}</span>
                  <span className="pd-badge neutral pd-vend-tag">{tradeLabel(v.trade, t)}</span>
                </div>
                <div className="pd-vend-contact">
                  <span><PhoneIcon /> {v.phone}</span>
                  {v.email && <span><MailIcon /> {v.email}</span>}
                </div>
              </div>
              <div className="pd-vend-row-actions">
                <button
                  type="button"
                  className="pd-vend-icon-btn"
                  onClick={() => openEditVendor(v)}
                  title={t('maintenance.editVendorTitle')}
                  aria-label={t('maintenance.editVendorAria', { name: v.name })}
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  className="pd-vend-icon-btn danger"
                  onClick={() => deleteVendor(v)}
                  title={t('maintenance.removeVendorTitle')}
                  aria-label={t('maintenance.removeVendorAria', { name: v.name })}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {vendorFormOpen ? (
        <form className="pd-vend-form" onSubmit={submitVendor}>
          <div className="pd-field">
            <label htmlFor="vend-trade">{t('maintenance.typeOfWork')}</label>
            <select
              id="vend-trade"
              className="pd-select"
              value={vendorForm.trade}
              onChange={(e) => setVendorForm({ ...vendorForm, trade: e.target.value })}
            >
              {VENDOR_TRADES.map((trade) => (
                <option key={trade} value={trade}>{t(`maintenance.trade.${trade}`)}</option>
              ))}
            </select>
          </div>
          <div className="pd-field">
            <label htmlFor="vend-name">{t('maintenance.nameLabel')}</label>
            <input
              id="vend-name"
              className="pd-input"
              value={vendorForm.name}
              onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
              placeholder={t('maintenance.namePlaceholder')}
            />
          </div>
          <div className="pd-field">
            <label htmlFor="vend-phone">{t('maintenance.phoneLabel')}</label>
            <input
              id="vend-phone"
              className="pd-input"
              value={vendorForm.phone}
              onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
              placeholder={t('maintenance.phonePlaceholder')}
            />
          </div>
          <div className="pd-field" style={{ marginBottom: 14 }}>
            <label htmlFor="vend-email">{t('maintenance.emailOptionalLabel')}</label>
            <input
              id="vend-email"
              className="pd-input"
              type="email"
              value={vendorForm.email}
              onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
              placeholder={t('maintenance.emailPlaceholder')}
            />
          </div>
          <div className="pd-actions">
            <button type="button" className="pd-btn pd-btn-secondary" onClick={closeVendorForm} disabled={savingVendor}>
              {t('maintenance.cancel')}
            </button>
            <button type="submit" className="pd-btn pd-btn-primary" disabled={savingVendor}>
              {savingVendor ? t('maintenance.saving') : editingVendorId ? t('maintenance.updateVendor') : t('maintenance.saveVendor')}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="pd-btn pd-btn-secondary pd-btn-block"
          onClick={openAddVendor}
          style={{ marginTop: vendors.length ? 14 : 0 }}
        >
          {t('maintenance.addVendor')}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <AppShell active="maintenance" wide>
        <div className="pd-page-header">
          <h1>{t('maintenance.pageTitle')}</h1>
          <p>{t('maintenance.pageSubtitle')}</p>
        </div>
        <p className="pd-empty">{t('maintenance.loading')}</p>
      </AppShell>
    );
  }

  return (
    <AppShell active="maintenance" wide>
      <div className="pd-page-header">
        <h1>{t('maintenance.pageTitle')}</h1>
        <p>{t('maintenance.pageSubtitle')}</p>
      </div>

      {error && <div className="pd-alert-danger">{error}</div>}

      <div className="pd-mnt-grid">
        <div className="pd-mnt-main">
          <div className="pd-card" style={{ marginBottom: 20 }}>
            <div className="pd-range-presets">
              <button
                className={`pd-btn ${filter === 'open' ? 'pd-btn-primary' : 'pd-btn-secondary'}`}
                onClick={() => setFilter('open')}
              >
                {t('maintenance.openInProgress')}
              </button>
              <button
                className={`pd-btn ${filter === 'all' ? 'pd-btn-primary' : 'pd-btn-secondary'}`}
                onClick={() => setFilter('all')}
              >
                {t('maintenance.allRequests')}
              </button>
            </div>
          </div>

          {visibleRequests.length === 0 ? (
            <p className="pd-empty">
              {requests.length === 0
                ? t('maintenance.noRequestsYet')
                : t('maintenance.nothingOpen')}
            </p>
          ) : (
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>{t('maintenance.tableProperty')}</th>
                    <th>{t('maintenance.tableTenant')}</th>
                    <th>{t('maintenance.tableRequest')}</th>
                    <th>{t('maintenance.tablePhoto')}</th>
                    <th>{t('maintenance.tableSubmitted')}</th>
                    <th>{t('maintenance.tableStatus')}</th>
                    <th>{t('maintenance.tableVendor')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((r) => {
                    const meta = statusMeta(r.status);
                    return (
                      <tr key={r.id}>
                        <td>{r.properties?.address || '—'}</td>
                        <td>
                          {r.tenants?.name || '—'}
                          {r.tenants?.unit_label ? ` — ${formatUnitLabel(r.tenants.unit_label, t('properties.unitLabel'))}` : ''}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.title}</div>
                          {r.description && (
                            <div className="pd-prow-city" style={{ marginTop: 2 }}>{r.description}</div>
                          )}
                        </td>
                        <td>
                          {r.photo_url ? (
                            <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={r.photo_url}
                                alt={t('maintenance.maintenanceIssueAlt')}
                                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                              />
                            </a>
                          ) : (
                            <span className="pd-prow-city">—</span>
                          )}
                        </td>
                        <td>{formatDate(r.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className={`pd-badge ${meta.badge}`} style={{ minWidth: 92, textAlign: 'center' }}>{t(`maintenance.status.${meta.value}`)}</span>
                            <select
                              className="pd-select"
                              style={{ width: 140, padding: '4px 28px 4px 8px', fontSize: 12.5 }}
                              value={r.status}
                              disabled={updatingId === r.id}
                              onChange={(e) => updateStatus(r, e.target.value)}
                            >
                              {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{t(`maintenance.status.${s.value}`)}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td>
                          <select
                            className="pd-select"
                            style={{ width: 160, padding: '4px 28px 4px 8px', fontSize: 12.5 }}
                            value={r.vendor_id || ''}
                            disabled={assigningVendorId === r.id || vendors.length === 0}
                            onChange={(e) => assignVendor(r, e.target.value)}
                          >
                            <option value="">{t('maintenance.noVendorAssigned')}</option>
                            {vendors.map((v) => (
                              <option key={v.id} value={v.id}>{v.name} — {tradeLabel(v.trade, t)}</option>
                            ))}
                          </select>
                          {r.vendors?.phone && (
                            <div className="pd-prow-city" style={{ marginTop: 4 }}>{r.vendors.phone}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pd-mnt-rail">
          {vendorsPanel}
        </div>
      </div>
    </AppShell>
  );
}
