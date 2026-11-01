import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import AppShell from '../components/AppShell';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

// Quebec landlords typically collect rent on the 1st -- used to fill in the
// {due_date} / {days_late} placeholders in the SMS templates.
function nextDueDate() {
  const now = new Date();
  const due = now.getDate() === 1 ? now : new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return due.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function daysLate() {
  const day = new Date().getDate();
  return day > 1 ? day - 1 : 0;
}

function fillTemplate(template, tenant) {
  const vars = {
    tenant_name: tenant.name,
    rent_amount: ((tenant.rent_amount || 0) / 100).toFixed(2),
    due_date: nextDueDate(),
    days_late: String(daysLate()),
    amount: ((tenant.pending_amount || tenant.rent_amount || 0) / 100).toFixed(2),
    payment_date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  };
  let text = template.template_text || '';
  Object.entries(vars).forEach(([key, val]) => {
    text = text.split(`{${key}}`).join(val);
  });
  return text;
}
function formatMessageDate(value) {
  const d = new Date(value);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minuteStr = minutes === 0 ? '' : `:${String(minutes).padStart(2, '0')}`;
  return `${mm}/${dd}/${yyyy} ${hours}${minuteStr}${ampm}`;
}

export default function CommunicationCenterPage() {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  };

  const loadData = async () => {
    try {
      const session = await getSession();
      if (!session) {
        setError(t('communicationCenter.pleaseLogInAgain'));
        return;
      }

      const backend = process.env.REACT_APP_BACKEND_URL;
      const authHeaders = { Authorization: `Bearer ${session.access_token}` };

      const [tenantsRes, messagesRes, templatesRes] = await Promise.all([
        fetch(`${backend}/api/tenants/landlord/${session.user.id}`, { headers: authHeaders }),
        fetch(`${backend}/api/sms/inbox/${session.user.id}`, { headers: authHeaders }),
        fetch(`${backend}/api/sms/templates`, { headers: authHeaders }),
      ]);

      const tenantsData = await tenantsRes.json();
      const messagesData = await messagesRes.json();
      const templatesData = await templatesRes.json();

      if (!tenantsRes.ok) throw new Error(tenantsData.error || t('communicationCenter.loadTenantsFailed'));
      if (!messagesRes.ok) throw new Error(messagesData.error || t('communicationCenter.loadMessagesFailed'));
      // Quick-action templates are a nice-to-have -- don't fail the whole
      // page over them if that route hiccups.
      setTenants(tenantsData.tenants || []);
      setMessages(messagesData.messages || []);
      setTemplates(templatesRes.ok ? (templatesData.templates || []) : []);
    } catch (err) {
      console.error('Error loading communication center:', err);
      setError(t('communicationCenter.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const tenantByPhone = (phone) => tenants.find((t) => t.phone === phone);
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  // "Payment Received" already goes out automatically when a payment is
  // recorded, so it's left out of the quick actions here to avoid a
  // duplicate-looking send. Late notices only make sense once a tenant is
  // actually behind.
  const quickTemplates = templates.filter((tpl) => {
    if (tpl.template_type === 'payment-received') return false;
    if (tpl.template_type === 'late-payment') return selectedTenant?.status === 'pending';
    return true;
  });

  const handleQuickAction = (tpl) => {
    if (!selectedTenant) return;
    setMessageText(fillTemplate(tpl, selectedTenant));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSendError('');
    setSendSuccess('');

    if (!selectedTenantId || !messageText.trim()) {
      setSendError(t('communicationCenter.chooseTenantAndMessage'));
      return;
    }

    setSending(true);
    try {
      const session = await getSession();
      if (!session) {
        setSendError(t('communicationCenter.pleaseLogInAgain'));
        return;
      }

      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tenant_id: selectedTenantId, message: messageText.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('communicationCenter.sendFailed'));
      }

      setSendSuccess(t('communicationCenter.sendSuccess'));
      setMessageText('');
      await loadData();
    } catch (err) {
      console.error('Error sending message:', err);
      setSendError(err.message || t('communicationCenter.sendFailedFallback'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <AppShell active="messages">
        <div className="pd-state"><p>{t('communicationCenter.loadingMessage')}</p></div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="messages">
        <div className="pd-state"><p>{error}</p></div>
      </AppShell>
    );
  }

  return (
    <AppShell active="messages">
      <div className="pd-page-header">
        <h1>{t('communicationCenter.pageTitle')}</h1>
        <p>{t('communicationCenter.pageSubtitle')}</p>
      </div>

      <div className="pd-card">
        <h2 className="pd-section-title">{t('communicationCenter.sendMessageSectionTitle')}</h2>
        {tenants.length === 0 ? (
          <p className="pd-empty">{t('communicationCenter.noTenantsEmptyState')}</p>
        ) : (
          <form onSubmit={handleSend}>
            {sendError && <div className="pd-alert">{sendError}</div>}
            {sendSuccess && <p className="pd-success-text">{sendSuccess}</p>}
            <div className="pd-field">
              <label htmlFor="comms-tenant">{t('communicationCenter.tenantLabel')}</label>
              <select
                id="comms-tenant"
                className="pd-select"
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
              >
                <option value="">{t('communicationCenter.selectTenantPlaceholder')}</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.phone})
                  </option>
                ))}
              </select>
            </div>
            {selectedTenant && quickTemplates.length > 0 && (
              <div className="pd-field">
                <label>{t('communicationCenter.quickTemplatesLabel')}</label>
                <div className="pd-quick-actions">
                  {quickTemplates.map((tpl) => (
                    <button
                      key={tpl.id || tpl.template_name}
                      type="button"
                      className="pd-btn pd-btn-secondary"
                      onClick={() => handleQuickAction(tpl)}
                    >
                      {tpl.template_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="pd-field">
              <label htmlFor="comms-message">{t('communicationCenter.messageLabel')}</label>
              <textarea
                id="comms-message"
                className="pd-textarea"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={t('communicationCenter.messagePlaceholder')}
                rows={3}
              />
            </div>
            <button type="submit" className="pd-btn pd-btn-primary" disabled={sending}>
              {sending ? t('communicationCenter.sending') : t('communicationCenter.sendButton')}
            </button>
          </form>
        )}
      </div>

      <h2 className="pd-section-title">{t('communicationCenter.messageHistoryTitle')}</h2>
      {messages.length === 0 ? (
        <p className="pd-empty">{t('communicationCenter.noMessagesEmptyState')}</p>
      ) : (
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>{t('communicationCenter.columnTenant')}</th>
                <th>{t('communicationCenter.columnPhone')}</th>
                <th>{t('communicationCenter.columnMessage')}</th>
                <th>{t('communicationCenter.columnDirection')}</th>
                <th>{t('communicationCenter.columnStatus')}</th>
                <th>{t('communicationCenter.columnDate')}</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => {
                const tenant = tenantByPhone(m.to_phone);
                return (
                  <tr key={m.id}>
                    <td>{tenant ? tenant.name : '—'}</td>
                    <td>{m.to_phone}</td>
                    <td>{m.message}</td>
                    <td>
                      <span className={`pd-badge ${m.status === 'received' ? 'neutral' : 'good'}`}>
                        {m.status === 'received' ? t('communicationCenter.statusReceived') : t('communicationCenter.statusSent')}
                      </span>
                    </td>
                    <td>{m.status}</td>
                    <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{formatMessageDate(m.created_at)}</td>
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
