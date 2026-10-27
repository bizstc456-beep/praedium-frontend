import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

export default function SettingsPage() {
  const [exporting, setExporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingPhone, setLoadingPhone] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  useEffect(() => {
    const loadAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoadingPhone(false);
          return;
        }
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/account`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (!response.ok) throw new Error('Failed to load account');
        const data = await response.json();
        setPhone(data.phone || '');
      } catch (err) {
        console.error('Load account error:', err);
      } finally {
        setLoadingPhone(false);
      }
    };
    loadAccount();
  }, []);
  const handleSavePhone = async () => {
    setError('');
    setPhoneSaved(false);
    setSavingPhone(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in first');
        return;
      }
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/account`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save phone number');
      setPhone(data.phone || '');
      setPhoneSaved(true);
    } catch (err) {
      console.error('Save phone error:', err);
      setError(err.message || 'Something went wrong saving your phone number. Please try again or contact support.');
    } finally {
      setSavingPhone(false);
    }
  };
  const handleExport = async () => {
    setError('');
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in first');
        return;
      }
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/account/export`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!response.ok) throw new Error('Failed to generate export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `praedium-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Something went wrong generating your export. Please try again or contact support.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = async () => {
    const confirmed = window.confirm(
      'This will request deletion of your Praedium account. Our team will review and action it within the grace period, rather than deleting instantly. Continue?'
    );
    if (!confirmed) return;

    setError('');
    setRequesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in first');
        return;
      }
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/account/delete-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit deletion request');
      setDeletionStatus(data);
    } catch (err) {
      console.error('Delete request error:', err);
      setError('Something went wrong submitting your deletion request. Please try again or contact support.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <AppShell active="settings">
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ marginBottom: 8 }}>Settings</h1>
        <p style={{ color: '#666', marginBottom: 32 }}>
          Manage your Praedium account data.
        </p>

        {error && (
          <div style={{ background: '#fdecea', color: '#b3261e', padding: '12px 16px', borderRadius: 8, marginBottom: 24 }}>
            {error}
          </div>
        )}

        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Phone number</h2>
          <p style={{ color: '#666' }}>
            Used to text you an alert when a tenant's rent is late. We'll never
            use it for anything else.
          </p>
          {loadingPhone ? (
            <p style={{ color: '#999' }}>Loading...</p>
          ) : (
            <>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneSaved(false); }}
                placeholder="+1 514 555 0123"
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 280,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid #d0d0d0',
                  fontSize: 16,
                  marginBottom: 12,
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                style={{
                  background: '#1f2937',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  cursor: savingPhone ? 'default' : 'pointer',
                  opacity: savingPhone ? 0.6 : 1
                }}
              >
                {savingPhone ? 'Saving...' : 'Save phone number'}
              </button>
              {phoneSaved && (
                <span style={{ color: '#1a7f37', marginLeft: 12, fontWeight: 500 }}>
                  Saved
                </span>
              )}
            </>
          )}
        </section>
        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Export your data</h2>
          <p style={{ color: '#666' }}>
            Download a copy of the personal data Praedium holds about your account
            -- your profile, plan and SMS history. This does not include your
            properties, tenants or leases.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              background: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: exporting ? 'default' : 'pointer',
              opacity: exporting ? 0.6 : 1
            }}
          >
            {exporting ? 'Preparing export...' : 'Export my data'}
          </button>
        </section>

        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Delete your account</h2>
          <p style={{ color: '#666' }}>
            Request deletion of your Praedium account. This does not delete your
            account immediately -- our team reviews every request and will follow
            up with you before anything is permanently removed.
          </p>

          {deletionStatus ? (
            <div style={{ color: '#1f2937', fontWeight: 500 }}>
              {deletionStatus.already_requested
                ? `Deletion already requested on ${new Date(deletionStatus.deletion_requested_at).toLocaleDateString()}. We'll be in touch.`
                : `Deletion requested on ${new Date(deletionStatus.deletion_requested_at).toLocaleDateString()}. We'll be in touch.`}
            </div>
          ) : (
            <button
              onClick={handleDeleteRequest}
              disabled={requesting}
              style={{
                background: 'white',
                color: '#b3261e',
                border: '1px solid #b3261e',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: requesting ? 'default' : 'pointer',
                opacity: requesting ? 0.6 : 1
              }}
            >
              {requesting ? 'Submitting request...' : 'Request account deletion'}
            </button>
          )}
        </section>
      </div>
    </AppShell>
  );
}