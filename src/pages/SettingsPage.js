import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell';
import LanguageToggle from '../components/LanguageToggle';
import { createClient } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

export default function SettingsPage() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingPhone, setLoadingPhone] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [languageSaved, setLanguageSaved] = useState(false);
  useEffect(() => {
    const loadAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoadingPhone(false);
          return;
        }
        setEmail(session.user.email || '');
        const data = await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/account`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
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
        alert(t('settings.pleaseLogIn'));
        return;
      }
      const data = await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/account`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });
      setPhone(data.phone || '');
      setPhoneSaved(true);
    } catch (err) {
      console.error('Save phone error:', err);
      setError(err.message || t('settings.savePhoneGenericError'));
    } finally {
      setSavingPhone(false);
    }
  };
  const handleSendPasswordReset = async () => {
    setError('');
    setResetSent(false);
    setSendingReset(true);
    try {
      if (!email) {
        alert(t('settings.pleaseLogIn'));
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(t('settings.passwordResetError'));
    } finally {
      setSendingReset(false);
    }
  };

  const handleLanguageChange = async (lang) => {
    setError('');
    setLanguageSaved(false);
    setSavingLanguage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/account`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferred_language: lang })
      });
      setLanguageSaved(true);
    } catch (err) {
      console.error('Save language error:', err);
      setError(err.message || t('settings.saveLanguageFailed'));
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleExport = async () => {
    setError('');
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(t('settings.pleaseLogIn'));
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
      setError(t('settings.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRequest = async () => {
    const confirmed = window.confirm(t('settings.deleteConfirm'));
    if (!confirmed) return;

    setError('');
    setRequesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(t('settings.pleaseLogIn'));
        return;
      }
      const data = await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/account/delete-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      setDeletionStatus(data);
    } catch (err) {
      console.error('Delete request error:', err);
      setError(err.message || t('settings.deleteRequestError'));
    } finally {
      setRequesting(false);
    }
  };

  return (
    <AppShell active="settings">
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ marginBottom: 8 }}>{t('settings.title')}</h1>
        <p style={{ color: '#666', marginBottom: 32 }}>
          {t('settings.subtitle')}
        </p>

        {error && (
          <div style={{ background: '#fdecea', color: '#b3261e', padding: '12px 16px', borderRadius: 8, marginBottom: 24 }}>
            {error}
          </div>
        )}
        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{t('settings.emailSectionTitle')}</h2>
          <p style={{ color: '#666' }}>
            {t('settings.emailSectionDescription')}
          </p>
          <p style={{ fontWeight: 600 }}>{email || '—'}</p>
        </section>
        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{t('settings.languageSectionTitle')}</h2>
          <p style={{ color: '#666' }}>
            {t('settings.languageSectionDescription')}
          </p>
          <LanguageToggle onChange={handleLanguageChange} />
          {savingLanguage && <span style={{ color: '#999', marginLeft: 12 }}>{t('settings.saving')}</span>}
          {languageSaved && !savingLanguage && (
            <span style={{ color: '#1a7f37', marginLeft: 12, fontWeight: 500 }}>
              {t('settings.saved')}
            </span>
          )}
        </section>
        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{t('settings.phoneSectionTitle')}</h2>
          <p style={{ color: '#666' }}>
            {t('settings.phoneSectionDescription')}
          </p>
          {loadingPhone ? (
            <p style={{ color: '#999' }}>{t('settings.loading')}</p>
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
                {savingPhone ? t('settings.saving') : t('settings.savePhoneButton')}
              </button>
              {phoneSaved && (
                <span style={{ color: '#1a7f37', marginLeft: 12, fontWeight: 500 }}>
                  {t('settings.saved')}
                </span>
              )}
            </>
          )}
        </section>
        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{t('settings.passwordSectionTitle')}</h2>
          <p style={{ color: '#666' }}>
            {t('settings.passwordSectionDescription')}
          </p>
          <button
            onClick={handleSendPasswordReset}
            disabled={sendingReset}
            style={{
              background: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              cursor: sendingReset ? 'default' : 'pointer',
              opacity: sendingReset ? 0.6 : 1
            }}
          >
            {sendingReset ? t('settings.sending') : t('settings.changePasswordButton')}
          </button>
          {resetSent && (
            <p style={{ color: '#1a7f37', marginTop: 12, fontWeight: 500 }}>
              {t('settings.resetSentMessage', { email })}
            </p>
          )}
        </section>
        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{t('settings.exportSectionTitle')}</h2>
          <p style={{ color: '#666' }}>
            {t('settings.exportSectionDescription')}
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
            {exporting ? t('settings.preparingExport') : t('settings.exportButton')}
          </button>
        </section>

        <section style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 24 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{t('settings.deleteSectionTitle')}</h2>
          <p style={{ color: '#666' }}>
            {t('settings.deleteSectionDescription')}
          </p>

          {deletionStatus ? (
            <div style={{ color: '#1f2937', fontWeight: 500 }}>
              {deletionStatus.already_requested
                ? t('settings.deletionAlreadyRequested', { date: new Date(deletionStatus.deletion_requested_at).toLocaleDateString() })
                : t('settings.deletionRequested', { date: new Date(deletionStatus.deletion_requested_at).toLocaleDateString() })}
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
              {requesting ? t('settings.submittingRequest') : t('settings.deleteRequestButton')}
            </button>
          )}
        </section>
      </div>
    </AppShell>
  );
}
