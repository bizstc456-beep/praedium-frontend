import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import TenantShell from '../components/TenantShell';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', resolved: 'Resolved' };
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

  const loadRequests = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) {
        setError('Please log in again.');
        return;
      }
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tenant-portal/maintenance`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load maintenance requests');
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading maintenance requests:', err);
      setError('Could not load your maintenance requests. Please try again shortly.');
    } finally {
      setLoading(false);
    }
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
      setFormError('That photo is too large (max 15MB). Please choose a smaller one.');
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
      setFormError('Give your request a short title.');
      return;
    }
    setSubmitting(true);
    try {
      const session = await getSession();
      if (!session) {
        setFormError('Please log in again.');
        return;
      }

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tenant-portal/maintenance`, {
        method: 'POST',
        headers: {
          // No Content-Type here -- the browser sets the multipart boundary itself.
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      setTitle('');
      setDescription('');
      setPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFormOpen(false);
      await loadRequests();
    } catch (err) {
      setFormError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TenantShell active="maintenance">
      <div className="pd-page-header pd-page-header-row">
        <div>
          <h1>Maintenance</h1>
          <p>Submit a request and track its status</p>
        </div>
        <button className="pd-btn pd-btn-primary" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? 'Cancel' : 'New request'}
        </button>
      </div>

      {error && <div className="pd-alert-danger">{error}</div>}

      {formOpen && (
        <div className="pd-card" style={{ marginBottom: 24 }}>
          <h2 className="pd-section-title">New maintenance request</h2>
          <form onSubmit={submitRequest}>
            {formError && <div className="pd-alert-danger">{formError}</div>}
            <div className="pd-field">
              <label>Title</label>
              <input
                className="pd-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Leaking kitchen faucet"
                required
              />
            </div>
            <div className="pd-field">
              <label>Details (optional)</label>
              <textarea
                className="pd-input"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything that would help your landlord understand the issue"
              />
            </div>
            <div className="pd-field">
              <label>Photo (optional)</label>
              <input
                ref={fileInputRef}
                className="pd-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              {photo && (
                <div className="pd-prow-city" style={{ marginTop: 4 }}>
                  {photo.name} selected
                </div>
              )}
            </div>
            <button type="submit" className="pd-btn pd-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit request'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="pd-empty">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="pd-empty">You haven't submitted any maintenance requests yet.</p>
      ) : (
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Photo</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
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
                          alt="Maintenance issue"
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                        />
                      </a>
                    ) : (
                      <span className="pd-prow-city">—</span>
                    )}
                  </td>
                  <td>{formatDate(r.created_at)}</td>
                  <td><span className={`pd-badge ${STATUS_BADGE[r.status] || 'neutral'}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TenantShell>
  );
}
