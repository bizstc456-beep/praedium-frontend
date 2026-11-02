import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import TenantShell from '../components/TenantShell';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-tenant-auth' } }
);

const STATUS_BADGE = { open: 'warn', in_progress: 'neutral', resolved: 'good' };
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export default function TenantMaintenancePage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const fileInputRef = useRef(null);

  const STATUS_LABEL = {
    open: t('tenantMaintenance.statusOpen'),
    in_progress: t('tenantMaintenance.statusInProgress'),
    resolved: t('tenantMaintenance.statusResolved'),
  };

  const loadRequests = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) {
        setError(t('tenantMaintenance.pleaseLogInAgain'));
        return;
      }
      const data = await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/tenant-portal/maintenance`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading maintenance requests:', err);
      setError(err.message || t('tenantMaintenance.loadError'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setPhoto(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setFormError(t('tenantMaintenance.photoTooLarge'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPhoto(null);
      return;
    }
    setFormError('');
    setPhoto(file);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) {
      setFormError(t('tenantMaintenance.titleRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const session = await getSession();
      if (!session) {
        setFormError(t('tenantMaintenance.pleaseLogInAgain'));
        return;
      }

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (photo) {
        formData.append('photo', photo);
      }

      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/tenant-portal/maintenance`, {
        method: 'POST',
        headers: {
          // No Content-Type here -- the browser sets the multipart boundary itself.
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      setTitle('');
      setDescription('');
      setPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFormOpen(false);
      await loadRequests();
    } catch (err) {
      setFormError(err.message || t('tenantMaintenance.submitFailedFallback'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TenantShell active="maintenance">
      <div className="pd-page-header pd-page-header-row">
        <div>
          <h1>{t('tenantMaintenance.title')}</h1>
          <p>{t('tenantMaintenance.subtitle')}</p>
        </div>
        <button className="pd-btn pd-btn-primary" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? t('tenantMaintenance.cancelButton') : t('tenantMaintenance.newRequestButton')}
        </button>
      </div>

      {error && <div className="pd-alert-danger">{error}</div>}

      {formOpen && (
        <div className="pd-card" style={{ marginBottom: 24 }}>
          <h2 className="pd-section-title">{t('tenantMaintenance.newRequestFormTitle')}</h2>
          <form onSubmit={submitRequest}>
            {formError && <div className="pd-alert-danger">{formError}</div>}
            <div className="pd-field">
              <label htmlFor="maint-title">{t('tenantMaintenance.titleLabel')}</label>
              <input
                id="maint-title"
                className="pd-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('tenantMaintenance.titlePlaceholder')}
                required
              />
            </div>
            <div className="pd-field">
              <label htmlFor="maint-details">{t('tenantMaintenance.detailsLabel')}</label>
              <textarea
                id="maint-details"
                className="pd-input"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('tenantMaintenance.detailsPlaceholder')}
              />
            </div>
            <div className="pd-field">
              <label htmlFor="maint-photo">{t('tenantMaintenance.photoLabel')}</label>
              <input
                id="maint-photo"
                ref={fileInputRef}
                className="pd-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              {photo && (
                <div className="pd-prow-city" style={{ marginTop: 4 }}>
                  {t('tenantMaintenance.photoSelected', { name: photo.name })}
                </div>
              )}
            </div>
            <button type="submit" className="pd-btn pd-btn-primary" disabled={submitting}>
              {submitting ? t('tenantMaintenance.submitting') : t('tenantMaintenance.submitRequestButton')}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="pd-empty">{t('tenantMaintenance.loading')}</p>
      ) : requests.length === 0 ? (
        <p className="pd-empty">{t('tenantMaintenance.emptyState')}</p>
      ) : (
        <div className="pd-table-wrap">
          <table className="pd-table pd-table-stack">
            <thead>
              <tr>
                <th>{t('tenantMaintenance.columnRequest')}</th>
                <th>{t('tenantMaintenance.columnPhoto')}</th>
                <th>{t('tenantMaintenance.columnSubmitted')}</th>
                <th>{t('tenantMaintenance.columnStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td data-label={t('tenantMaintenance.columnRequest')}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      {r.description && (
                        <div className="pd-prow-city" style={{ marginTop: 2 }}>{r.description}</div>
                      )}
                    </div>
                  </td>
                  <td data-label={t('tenantMaintenance.columnPhoto')}>
                    {r.photo_url ? (
                      <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={r.photo_url}
                          alt={t('tenantMaintenance.photoAlt')}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                        />
                      </a>
                    ) : (
                      <span className="pd-prow-city">—</span>
                    )}
                  </td>
                  <td data-label={t('tenantMaintenance.columnSubmitted')}>{formatDate(r.created_at)}</td>
                  <td data-label={t('tenantMaintenance.columnStatus')}><span className={`pd-badge ${STATUS_BADGE[r.status] || 'neutral'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TenantShell>
  );
}
