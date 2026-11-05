import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';
import AppShell from '../components/AppShell';
import KebabMenu from '../components/KebabMenu';
import DatePicker from '../components/DatePicker';
import { apiRequest } from '../utils/api';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

const EMPTY_PROPERTY = {
  address: '', city: '', province: 'QC', postal_code: '',
  property_type: 'duplex', bedrooms: '', bathrooms: '', notes: '',
};

const EMPTY_TENANT = {
  name: '', email: '', phone: '', unit_label: '',
  rent_amount: '', lease_start_date: '', lease_end_date: '',
  lowest_rent_disclosed_amount: '', lowest_rent_disclosure_note: '',
  is_month_to_month: false, planned_rent_change_date: '',
};

const EMPTY_PAYMENT = { amount: '', payment_date: '', payment_method: 'e-transfer' };

const PROPERTY_TYPES = ['single-family', 'duplex', 'triplex', 'fourplex', 'condo', 'other'];

function formatMoney(cents) {
  const amount = (cents || 0) / 100;
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${parts[0]},${parts[1]}$`;
}

function toDateInputValue(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export default function PropertiesPage() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const [propertyFormOpen, setPropertyFormOpen] = useState(null); // null | 'new' | property id
  const [propertyForm, setPropertyForm] = useState(EMPTY_PROPERTY);

  const [tenantFormOpen, setTenantFormOpen] = useState(null); // null | { propertyId, tenantId? }
  const [tenantForm, setTenantForm] = useState(EMPTY_TENANT);

  const [paymentFormOpen, setPaymentFormOpen] = useState(null); // null | tenant id
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [paymentSuccess, setPaymentSuccess] = useState('');

  // Which "Documents" panel is expanded -- 'property-<id>' or 'tenant-<id>'.
  // Only one open at a time keeps the page from getting cluttered.
  const [docsOpenKey, setDocsOpenKey] = useState(null);

  // Per-tenant "Invite to Portal" status: { [tenantId]: { loading?, error?, success? } }
  const [inviteStatus, setInviteStatus] = useState({});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link from the dashboard's "+ Add property" quick action
  // (?new=1) -- opens the form once, then cleans the URL so a refresh
  // doesn't reopen it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      openNewPropertyForm();
      window.history.replaceState({}, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep links from the dashboard's "Getting started" checklist, once
  // properties/tenants are loaded -- ?addTenant=<propertyId> opens that
  // property's add-tenant form, ?recordPayment=<tenantId> opens that
  // tenant's payment form. Both need real data (the property/tenant must
  // exist, and the payment form needs the full tenant record), so this
  // waits for loadData() to finish instead of firing on mount like ?new=1.
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);

    const addTenantPropertyId = params.get('addTenant');
    if (addTenantPropertyId && properties.some((p) => p.id === addTenantPropertyId)) {
      openNewTenantForm(addTenantPropertyId);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const recordPaymentTenantId = params.get('recordPayment');
    if (recordPaymentTenantId) {
      const tenant = tenants.find((tn) => tn.id === recordPaymentTenantId);
      if (tenant) {
        openPaymentForm(tenant);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const loadData = async () => {
    try {
      const session = await getSession();
      if (!session) {
        setError(t('properties.pleaseLogIn'));
        return;
      }

      const backend = process.env.REACT_APP_BACKEND_URL;
      const authHeaders = { Authorization: `Bearer ${session.access_token}` };

      const [propsData, tenantsData] = await Promise.all([
        apiRequest(`${backend}/api/properties/${session.user.id}`, { headers: authHeaders }),
        apiRequest(`${backend}/api/tenants/landlord/${session.user.id}`, { headers: authHeaders }),
      ]);

      setProperties(propsData.properties || []);
      setTenants(tenantsData.tenants || []);
    } catch (err) {
      console.error('Error loading properties:', err);
      setError(err.message || t('properties.couldNotLoad'));
    } finally {
      setLoading(false);
    }
  };

  const tenantsByProperty = tenants.reduce((acc, tenant) => {
    if (!acc[tenant.property_id]) acc[tenant.property_id] = [];
    acc[tenant.property_id].push(tenant);
    return acc;
  }, {});

  const toggleDocs = (key) => {
    setDocsOpenKey((current) => (current === key ? null : key));
  };

  // ---- property form ----

  const openNewPropertyForm = () => {
    setFormError('');
    setPropertyForm(EMPTY_PROPERTY);
    setPropertyFormOpen('new');
  };

  const openEditPropertyForm = (p) => {
    setFormError('');
    setPropertyForm({
      address: p.address || '',
      city: p.city || '',
      province: p.province || 'QC',
      postal_code: p.postal_code || '',
      property_type: p.property_type || 'duplex',
      bedrooms: p.bedrooms ?? '',
      bathrooms: p.bathrooms ?? '',
      notes: p.notes || '',
    });
    setPropertyFormOpen(p.id);
  };

  const closePropertyForm = () => {
    setPropertyFormOpen(null);
    setFormError('');
  };

  const submitPropertyForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!propertyForm.address.trim() || !propertyForm.city.trim()) {
      setFormError(t('properties.addressCityRequired'));
      return;
    }

    try {
      const session = await getSession();
      if (!session) {
        setFormError(t('properties.pleaseLogIn'));
        return;
      }

      const backend = process.env.REACT_APP_BACKEND_URL;
      const isNew = propertyFormOpen === 'new';
      const url = isNew
        ? `${backend}/api/properties`
        : `${backend}/api/properties/${propertyFormOpen}`;

      await apiRequest(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...propertyForm,
          bedrooms: propertyForm.bedrooms === '' ? null : Number(propertyForm.bedrooms),
          bathrooms: propertyForm.bathrooms === '' ? null : Number(propertyForm.bathrooms),
        }),
      });

      closePropertyForm();
      await loadData();
    } catch (err) {
      if (err.code === 'plan_limit_reached' && err.data) {
        setFormError(t('properties.planLimitReached', {
          currentUnits: err.data.current_units,
          maxUnits: err.data.max_units,
          planName: t(`payment.tiers.${err.data.plan_tier}.name`),
        }));
      } else {
        setFormError(err.message || t('properties.failedToSaveProperty'));
      }
    }
  };

  const deleteProperty = async (p) => {
    const unitCount = (tenantsByProperty[p.id] || []).length;
    const warning = unitCount
      ? t('properties.deletePropertyConfirmWithTenants', { address: p.address, count: unitCount })
      : t('properties.deletePropertyConfirmNoTenants', { address: p.address });
    if (!window.confirm(warning)) return;

    try {
      const session = await getSession();
      if (!session) {
        setError(t('properties.pleaseLogIn'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/properties/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await loadData();
    } catch (err) {
      setError(err.message || t('properties.failedToDeleteProperty'));
    }
  };

  // ---- tenant form ----

  const openNewTenantForm = (propertyId) => {
    setFormError('');
    setTenantForm(EMPTY_TENANT);
    setTenantFormOpen({ propertyId });
  };

  const openEditTenantForm = (tenant) => {
    setFormError('');
    setTenantForm({
      name: tenant.name || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      unit_label: tenant.unit_label || '',
      rent_amount: tenant.rent_amount ? (tenant.rent_amount / 100).toFixed(2) : '',
      lease_start_date: toDateInputValue(tenant.lease_start_date),
      lease_end_date: toDateInputValue(tenant.lease_end_date),
      lowest_rent_disclosed_amount: tenant.lowest_rent_disclosed_amount ? (tenant.lowest_rent_disclosed_amount / 100).toFixed(2) : '',
      lowest_rent_disclosure_note: tenant.lowest_rent_disclosure_note || '',
      is_month_to_month: !!tenant.is_month_to_month,
      planned_rent_change_date: toDateInputValue(tenant.planned_rent_change_date),
    });
    setTenantFormOpen({ propertyId: tenant.property_id, tenantId: tenant.id });
  };

  const closeTenantForm = () => {
    setTenantFormOpen(null);
    setFormError('');
  };

  const submitTenantForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!tenantForm.name.trim() || !tenantForm.phone.trim()) {
      setFormError(t('properties.nameAndPhoneRequired'));
      return;
    }

    try {
      const session = await getSession();
      if (!session) {
        setFormError(t('properties.pleaseLogIn'));
        return;
      }

      const backend = process.env.REACT_APP_BACKEND_URL;
      const isNew = !tenantFormOpen.tenantId;
      const url = isNew
        ? `${backend}/api/tenants`
        : `${backend}/api/tenants/${tenantFormOpen.tenantId}`;

      const rentCents = tenantForm.rent_amount === '' ? null : Math.round(Number(tenantForm.rent_amount) * 100);
      const lowestRentDisclosedCents = tenantForm.lowest_rent_disclosed_amount === ''
        ? null
        : Math.round(Number(tenantForm.lowest_rent_disclosed_amount) * 100);

      await apiRequest(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...tenantForm,
          rent_amount: rentCents,
          lowest_rent_disclosed_amount: lowestRentDisclosedCents,
          lowest_rent_disclosure_note: tenantForm.lowest_rent_disclosure_note || null,
          property_id: tenantFormOpen.propertyId,
        }),
      });

      closeTenantForm();
      await loadData();
    } catch (err) {
      setFormError(err.message || t('properties.failedToSaveTenant'));
    }
  };

  const deleteTenant = async (tenant) => {
    const warning = t('properties.deleteTenantConfirm', { name: tenant.name });
    if (!window.confirm(warning)) return;

    try {
      const session = await getSession();
      if (!session) {
        setError(t('properties.pleaseLogIn'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/tenants/${tenant.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await loadData();
    } catch (err) {
      setError(err.message || t('properties.failedToDeleteTenant'));
    }
  };

  const inviteTenant = async (tenant) => {
    setInviteStatus((s) => ({ ...s, [tenant.id]: { loading: true } }));
    try {
      const session = await getSession();
      if (!session) {
        setInviteStatus((s) => ({ ...s, [tenant.id]: { error: t('properties.pleaseLogIn') } }));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/tenants/${tenant.id}/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setInviteStatus((s) => ({ ...s, [tenant.id]: { success: true } }));
      await loadData();
    } catch (err) {
      setInviteStatus((s) => ({ ...s, [tenant.id]: { error: err.message || t('properties.failedToSendInvite') } }));
    }
  };

  // ---- payment form ----

  const openPaymentForm = (tenant) => {
    setFormError('');
    setPaymentSuccess('');
    const defaultAmount = (tenant.pending_amount > 0 ? tenant.pending_amount : tenant.rent_amount) || 0;
    setPaymentForm({
      amount: (defaultAmount / 100).toFixed(2),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'e-transfer',
    });
    setPaymentFormOpen(tenant.id);
  };

  const closePaymentForm = () => {
    setPaymentFormOpen(null);
    setFormError('');
  };

  const submitPaymentForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setFormError(t('properties.enterPaymentAmount'));
      return;
    }

    try {
      const session = await getSession();
      if (!session) {
        setFormError(t('properties.pleaseLogIn'));
        return;
      }

      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/payments/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tenant_id: paymentFormOpen,
          amount: Math.round(Number(paymentForm.amount) * 100),
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
        }),
      });

      setPaymentSuccess(t('properties.paymentRecorded'));
      setPaymentFormOpen(null);
      await loadData();
    } catch (err) {
      setFormError(err.message || t('properties.failedToRecordPayment'));
    }
  };

  const cancelLastPayment = async (tenantId) => {
    if (!window.confirm(t('properties.cancelLastPaymentConfirm'))) return;
    setFormError('');
    try {
      const session = await getSession();
      if (!session) {
        setFormError(t('properties.pleaseLogIn'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/payments/${tenantId}/latest`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      setPaymentSuccess(t('properties.lastPaymentCanceled'));
      await loadData();
    } catch (err) {
      setFormError(err.message || t('properties.failedToCancelPayment'));
    }
  };

  if (loading) {
    return (
      <AppShell active="properties">
        <div className="pd-state"><p>{t('properties.loadingProperties')}</p></div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell active="properties">
        <div className="pd-state"><p>{error}</p></div>
      </AppShell>
    );
  }

  return (
    <AppShell active="properties">
      <div className="pd-page-header pd-page-header-row">
        <div>
          <h1>{t('properties.pageTitle')}</h1>
          <p>{t('properties.pageSubtitle')}</p>
        </div>
        <button className="pd-btn pd-btn-primary" onClick={openNewPropertyForm}>{t('properties.addProperty')}</button>
      </div>

      {paymentSuccess && <p className="pd-success-text">{paymentSuccess}</p>}

      {propertyFormOpen === 'new' && (
        <div className="pd-card">
          <h2 className="pd-section-title">{t('properties.newProperty')}</h2>
          {formError && <div className="pd-alert">{formError}</div>}
          <PropertyForm
            form={propertyForm}
            setForm={setPropertyForm}
            onSubmit={submitPropertyForm}
            onCancel={closePropertyForm}
          />
        </div>
      )}

      {properties.length === 0 ? (
        <p className="pd-empty">{t('properties.noPropertiesYet')}</p>
      ) : (
        properties.map((p) => {
          const propertyDocsKey = `property-${p.id}`;
          return (
            <div className="pd-property-card" key={p.id}>
              {propertyFormOpen === p.id ? (
                <>
                  <h2 className="pd-section-title">{t('properties.editProperty')}</h2>
                  {formError && <div className="pd-alert">{formError}</div>}
                  <PropertyForm
                    form={propertyForm}
                    setForm={setPropertyForm}
                    onSubmit={submitPropertyForm}
                    onCancel={closePropertyForm}
                  />
                </>
              ) : (
                <div className="pd-property-head">
                  <div>
                    <div className="pd-prow-addr">{p.address}</div>
                    <div className="pd-prow-city">
                      {p.city}{p.property_type ? ` · ${t(`properties.propertyTypes.${p.property_type}`)}` : ''}
                      {p.bedrooms ? ` · ${t('properties.bedCount', { count: p.bedrooms })}` : ''}{p.bathrooms ? ` / ${t('properties.bathCount', { count: p.bathrooms })}` : ''}
                    </div>
                    {p.notes && <div className="pd-property-notes">{p.notes}</div>}
                  </div>
                  <div className="pd-property-actions">
                    <button className="pd-btn pd-btn-secondary" onClick={() => openEditPropertyForm(p)}>{t('properties.edit')}</button>
                    <button className="pd-btn pd-btn-primary" onClick={() => openNewTenantForm(p.id)}>{t('properties.addTenant')}</button>
                    <KebabMenu
                      items={[
                        { label: docsOpenKey === propertyDocsKey ? t('properties.hideDocuments') : t('properties.documents'), onClick: () => toggleDocs(propertyDocsKey) },
                        { label: t('properties.deletePropertyMenu'), onClick: () => deleteProperty(p), danger: true },
                      ]}
                    />
                  </div>
                </div>
              )}

              {docsOpenKey === propertyDocsKey && (
                <div className="pd-nested-card">
                  <div className="pd-panel-head">
                    <h2 className="pd-section-title">{t('properties.propertyDocumentsTitle')}</h2>
                    <button
                      type="button"
                      className="pd-panel-close"
                      aria-label={t('properties.closeDocuments')}
                      onClick={() => toggleDocs(propertyDocsKey)}
                    >
                      &times;
                    </button>
                  </div>
                  <p className="pd-empty" style={{ marginTop: -8, marginBottom: 10 }}>
                    {t('properties.propertyDocumentsDescription')}
                  </p>
                  <DocumentsPanel entityType="property" entityId={p.id} />
                </div>
              )}

              {tenantFormOpen?.propertyId === p.id && !tenantFormOpen.tenantId && (
                <div className="pd-card pd-nested-card">
                  <h2 className="pd-section-title">{t('properties.newTenant')}</h2>
                  {formError && <div className="pd-alert">{formError}</div>}
                  <TenantForm
                    form={tenantForm}
                    setForm={setTenantForm}
                    onSubmit={submitTenantForm}
                    onCancel={closeTenantForm}
                  />
                </div>
              )}

              {(tenantsByProperty[p.id] || []).length === 0 ? (
                <p className="pd-empty">{t('properties.noTenantsYet')}</p>
              ) : (
                <div className="pd-unit-list">
                  {tenantsByProperty[p.id].map((tenant) => {
                    const tenantDocsKey = `tenant-${tenant.id}`;
                    return (
                      <React.Fragment key={tenant.id}>
                        {tenantFormOpen?.tenantId === tenant.id ? (
                          <div className="pd-card pd-nested-card">
                            <h2 className="pd-section-title">{t('properties.editTenant')}</h2>
                            {formError && <div className="pd-alert">{formError}</div>}
                            <TenantForm
                              form={tenantForm}
                              setForm={setTenantForm}
                              onSubmit={submitTenantForm}
                              onCancel={closeTenantForm}
                            />
                          </div>
                        ) : (
                          <div className="pd-unit-row">
                            <div className="pd-unit-info">
                              <div className="pd-unit-name">
                                {tenant.name}{tenant.unit_label ? ` — ${tenant.unit_label}` : ''}
                                {tenant.renewal_soon && (
                                  <span className="pd-badge warn pd-unit-badge">
                                    {tenant.is_month_to_month ? t('properties.noticeWindowOpen') : t('properties.leaseEndsSoon')}
                                  </span>
                                )}
                                {tenant.auth_user_id && <span className="pd-badge good pd-unit-badge">{t('properties.portalInvited')}</span>}
                              </div>
                              <div className="pd-prow-city">
                                {tenant.phone}{tenant.email ? ` · ${tenant.email}` : ''}
                                {tenant.is_month_to_month
                                  ? ` · ${t('properties.monthToMonthLabel')}`
                                  : (tenant.lease_end_date ? ` · ${t('properties.leaseEndsOn', { date: toDateInputValue(tenant.lease_end_date) })}` : '')}
                              </div>
                            </div>
                            <div className="pd-prow-rent">{formatMoney(tenant.rent_amount)}{t('properties.perMonth')}</div>
                            <span className={`pd-dot-status ${tenant.status === 'paid' ? 'good' : 'warn'}`}>
                              {tenant.status === 'paid' ? t('properties.paid') : t('properties.pendingAmount', { amount: formatMoney(tenant.pending_amount) })}
                            </span>
                            <div className="pd-unit-actions">
                              <button className="pd-btn pd-btn-secondary" onClick={() => openEditTenantForm(tenant)}>{t('properties.edit')}</button>
                              <button className="pd-btn pd-btn-primary" onClick={() => openPaymentForm(tenant)}>{t('properties.recordPayment')}</button>
                              <KebabMenu
                                items={[
                                  ...(tenant.auth_user_id ? [] : [{
                                    label: inviteStatus[tenant.id]?.loading ? t('properties.inviting') : t('properties.inviteToPortal'),
                                    onClick: () => inviteTenant(tenant),
                                    disabled: !tenant.email || inviteStatus[tenant.id]?.loading,
                                    title: !tenant.email ? t('properties.addEmailFirst') : t('properties.sendPortalInvite'),
                                  }]),
                                  { label: docsOpenKey === tenantDocsKey ? t('properties.hideDocs') : t('properties.documents'), onClick: () => toggleDocs(tenantDocsKey) },
                                  { label: t('properties.deleteTenantMenu'), onClick: () => deleteTenant(tenant), danger: true },
                                ]}
                              />
                            </div>
                            {inviteStatus[tenant.id]?.error && (
                              <div className="pd-alert-danger" style={{ marginTop: 8 }}>{inviteStatus[tenant.id].error}</div>
                            )}
                            {inviteStatus[tenant.id]?.success && (
                              <div className="pd-alert-success" style={{ marginTop: 8 }}>{t('properties.inviteSentTo', { email: tenant.email })}</div>
                            )}
                          </div>
                        )}

                        {docsOpenKey === tenantDocsKey && (
                          <div className="pd-nested-card">
                            <div className="pd-panel-head">
                              <h2 className="pd-section-title">{t('properties.tenantDocumentsTitle', { name: tenant.name })}</h2>
                              <button
                                type="button"
                                className="pd-panel-close"
                                aria-label={t('properties.closeDocuments')}
                                onClick={() => toggleDocs(tenantDocsKey)}
                              >
                                &times;
                              </button>
                            </div>
                            <p className="pd-empty" style={{ marginTop: -8, marginBottom: 10 }}>
                              {t('properties.tenantDocumentsDescription')}
                            </p>
                            <DocumentsPanel entityType="tenant" entityId={tenant.id} />
                          </div>
                        )}

                        {paymentFormOpen === tenant.id && (
                          <div className="pd-card pd-nested-card">
                            <h2 className="pd-section-title">{t('properties.recordPaymentTitle', { name: tenant.name })}</h2>
                            {formError && <div className="pd-alert">{formError}</div>}
                            <form onSubmit={submitPaymentForm}>
                              <div className="pd-form-row">
                                <div className="pd-field">
                                  <label htmlFor="payment-amount">{t('properties.fieldAmount')}</label>
                                  <input
                                    id="payment-amount"
                                    className="pd-input"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                  />
                                </div>
                                <div className="pd-field">
                                  <label htmlFor="payment-date">{t('properties.fieldDate')}</label>
                                  <input
                                    id="payment-date"
                                    className="pd-input"
                                    type="date"
                                    value={paymentForm.payment_date}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                  />
                                </div>
                                <div className="pd-field">
                                  <label htmlFor="payment-method">{t('properties.fieldMethod')}</label>
                                  <select
                                    id="payment-method"
                                    className="pd-select"
                                    value={paymentForm.payment_method}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                                  >
                                    <option value="e-transfer">{t('properties.paymentMethods.eTransfer')}</option>
                                    <option value="cheque">{t('properties.paymentMethods.cheque')}</option>
                                    <option value="cash">{t('properties.paymentMethods.cash')}</option>
                                    <option value="card">{t('properties.paymentMethods.card')}</option>
                                  </select>
                                </div>
                              </div>
                              <div className="pd-form-actions">
                                <button type="submit" className="pd-btn pd-btn-primary">{t('properties.recordPayment')}</button>
                                <button type="button" className="pd-btn pd-btn-secondary" onClick={closePaymentForm}>{t('properties.cancel')}</button>
                                <button type="button" className="pd-btn pd-btn-danger" onClick={() => cancelLastPayment(tenant.id)}>{t('properties.cancelLastPayment')}</button>
                              </div>
                            </form>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </AppShell>
  );
}

function PropertyForm({ form, setForm, onSubmit, onCancel }) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit}>
      <div className="pd-form-row">
        <div className="pd-field">
          <label htmlFor="property-address">{t('properties.fieldAddress')}</label>
          <input id="property-address" className="pd-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="245 Rue Principale" />
        </div>
        <div className="pd-field">
          <label htmlFor="property-city">{t('properties.fieldCity')}</label>
          <input id="property-city" className="pd-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Saint-Constant" />
        </div>
      </div>
      <div className="pd-form-row">
        <div className="pd-field">
          <label htmlFor="property-province">{t('properties.fieldProvince')}</label>
          <input id="property-province" className="pd-input" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
        </div>
        <div className="pd-field">
          <label htmlFor="property-postal-code">{t('properties.fieldPostalCode')}</label>
          <input id="property-postal-code" className="pd-input" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} placeholder="J5A 2G9" />
        </div>
      </div>
      <div className="pd-form-row">
        <div className="pd-field">
          <label htmlFor="property-type">{t('properties.fieldType')}</label>
          <select id="property-type" className="pd-select" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>{t(`properties.propertyTypes.${type}`)}</option>
            ))}
          </select>
        </div>
        <div className="pd-field">
          <label htmlFor="property-bedrooms">{t('properties.fieldBedrooms')}</label>
          <input id="property-bedrooms" className="pd-input" type="number" min="0" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
        </div>
        <div className="pd-field">
          <label htmlFor="property-bathrooms">{t('properties.fieldBathrooms')}</label>
          <input id="property-bathrooms" className="pd-input" type="number" min="0" step="0.5" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
        </div>
      </div>
      <div className="pd-field">
        <label htmlFor="property-notes">{t('properties.fieldNotes')}</label>
        <textarea id="property-notes" className="pd-textarea" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('properties.notesPlaceholder')} />
      </div>
      <div className="pd-form-actions">
        <button type="submit" className="pd-btn pd-btn-primary">{t('properties.saveProperty')}</button>
        <button type="button" className="pd-btn pd-btn-secondary" onClick={onCancel}>{t('properties.cancel')}</button>
      </div>
    </form>
  );
}

function TenantForm({ form, setForm, onSubmit, onCancel }) {
  const { t } = useTranslation();
  return (
    <form onSubmit={onSubmit}>
      <div className="pd-form-row">
        <div className="pd-field">
          <label htmlFor="tenant-name">{t('properties.fieldTenantName')}</label>
          <input id="tenant-name" className="pd-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="pd-field">
          <label htmlFor="tenant-unit">{t('properties.fieldUnit')}</label>
          <input id="tenant-unit" className="pd-input" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} placeholder={t('properties.unitPlaceholder')} />
        </div>
      </div>
      <div className="pd-form-row">
        <div className="pd-field">
          <label htmlFor="tenant-phone">{t('properties.fieldPhone')}</label>
          <input id="tenant-phone" className="pd-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+15145551234" />
        </div>
        <div className="pd-field">
          <label htmlFor="tenant-email">{t('properties.fieldEmail')}</label>
          <input id="tenant-email" className="pd-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="pd-form-row">
        <div className="pd-field">
          <label htmlFor="tenant-rent">{t('properties.fieldMonthlyRent')}</label>
          <input id="tenant-rent" className="pd-input" type="number" step="0.01" min="0" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} placeholder="1850.00" />
        </div>
        <div className="pd-field">
          <label htmlFor="tenant-lease-start">{t('properties.fieldLeaseStart')}</label>
          <DatePicker id="tenant-lease-start" value={form.lease_start_date} onChange={(d) => setForm({ ...form, lease_start_date: d })} />
        </div>
        <div className="pd-field">
          {form.is_month_to_month ? (
            <>
              <label htmlFor="tenant-planned-change-date">
                {t('properties.fieldPlannedRentChangeDate')}
                <span className="pd-info-tip">
                  <span className="pd-info-icon">i</span>
                  <span className="pd-info-bubble">{t('properties.plannedRentChangeDateTip')}</span>
                </span>
              </label>
              <DatePicker
                id="tenant-planned-change-date"
                value={form.planned_rent_change_date}
                onChange={(d) => setForm({ ...form, planned_rent_change_date: d })}
              />
            </>
          ) : (
            <>
              <label htmlFor="tenant-lease-end">{t('properties.fieldLeaseEnd')}</label>
              <DatePicker id="tenant-lease-end" value={form.lease_end_date} onChange={(d) => setForm({ ...form, lease_end_date: d })} />
            </>
          )}
        </div>
      </div>
      <div className="pd-field pd-field-checkbox">
        <label className="pd-checkbox-label">
          <input
            type="checkbox"
            checked={form.is_month_to_month}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm({
                ...form,
                is_month_to_month: checked,
                lease_end_date: checked ? '' : form.lease_end_date,
                planned_rent_change_date: checked ? form.planned_rent_change_date : '',
              });
            }}
          />
          <span>
            {t('properties.fieldMonthToMonth')}
            <span className="pd-info-tip">
              <span className="pd-info-icon">i</span>
              <span className="pd-info-bubble">{t('properties.monthToMonthTip')}</span>
            </span>
          </span>
        </label>
      </div>
      <div className="pd-form-row">
        <div className="pd-field">
          <label htmlFor="tenant-lowest-rent">
            {t('properties.fieldLowestRentDisclosed')}
            <span className="pd-info-tip">
              <span className="pd-info-icon">i</span>
              <span className="pd-info-bubble">{t('properties.lowestRentTip')}</span>
            </span>
          </label>
          <input
            id="tenant-lowest-rent"
            className="pd-input"
            type="number"
            step="0.01"
            min="0"
            value={form.lowest_rent_disclosed_amount}
            onChange={(e) => setForm({ ...form, lowest_rent_disclosed_amount: e.target.value })}
            placeholder="1700.00"
          />
        </div>
        <div className="pd-field">
          <label htmlFor="tenant-disclosure-note">{t('properties.fieldDisclosureNote')}</label>
          <input
            id="tenant-disclosure-note"
            className="pd-input"
            value={form.lowest_rent_disclosure_note}
            onChange={(e) => setForm({ ...form, lowest_rent_disclosure_note: e.target.value })}
            placeholder={t('properties.disclosureNotePlaceholder')}
          />
        </div>
      </div>
      <div className="pd-form-actions">
        <button type="submit" className="pd-btn pd-btn-primary">{t('properties.saveTenant')}</button>
        <button type="button" className="pd-btn pd-btn-secondary" onClick={onCancel}>{t('properties.cancel')}</button>
      </div>
    </form>
  );
}

const DOC_CATEGORY_VALUES = ['lease', 'id', 'insurance', 'inspection', 'other'];

function docIconLabel(mimeType) {
  if (!mimeType) return 'F';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('image')) return 'IMG';
  return 'DOC';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Self-contained upload/list/delete panel for one tenant's or one property's
// documents. Mounted only while its "Documents" toggle is open, which is
// also what triggers the initial load.
function DocumentsPanel({ entityType, entityId }) {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('other');
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const session = await getSession();
      if (!session) {
        setError(t('properties.pleaseLogIn'));
        return;
      }
      const data = await apiRequest(
        `${process.env.REACT_APP_BACKEND_URL}/api/documents/${entityType}/${entityId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message || t('properties.failedToLoadDocuments'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError(t('properties.chooseFileFirst'));
      return;
    }

    setUploading(true);
    setError('');
    try {
      const session = await getSession();
      if (!session) {
        setError(t('properties.pleaseLogIn'));
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append(entityType === 'tenant' ? 'tenant_id' : 'property_id', entityId);

      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments();
    } catch (err) {
      setError(err.message || t('properties.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(t('properties.deleteDocumentConfirm', { fileName: doc.file_name }))) return;
    try {
      const session = await getSession();
      if (!session) {
        setError(t('properties.pleaseLogIn'));
        return;
      }
      await apiRequest(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await loadDocuments();
    } catch (err) {
      setError(err.message || t('properties.failedToDeleteDocument'));
    }
  };

  return (
    <div>
      {error && <div className="pd-alert">{error}</div>}

      {loading ? (
        <p className="pd-empty">{t('properties.loadingDocuments')}</p>
      ) : documents.length === 0 ? (
        <p className="pd-empty">{t('properties.noDocumentsYet')}</p>
      ) : (
        <div className="pd-doc-list">
          {documents.map((doc) => (
            <div className="pd-doc-row" key={doc.id}>
              <div className="pd-doc-info">
                <div className="pd-doc-icon">{docIconLabel(doc.mime_type)}</div>
                <div>
                  <a className="pd-doc-name" href={doc.url} target="_blank" rel="noopener noreferrer">
                    {doc.file_name}
                  </a>
                  <div className="pd-doc-meta">
                    {t(`properties.docCategories.${doc.category || 'other'}`)}
                    {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                  </div>
                </div>
              </div>
              <button className="pd-btn pd-btn-danger" onClick={() => handleDelete(doc)}>{t('properties.deleteDocument')}</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleUpload} className="pd-doc-upload-row">
        <input type="file" ref={fileInputRef} />
        <select className="pd-doc-category-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {DOC_CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>{t(`properties.docCategories.${value}`)}</option>
          ))}
        </select>
        <button type="submit" className="pd-btn pd-btn-secondary" disabled={uploading}>
          {uploading ? t('properties.uploading') : t('properties.upload')}
        </button>
      </form>
    </div>
  );
}
