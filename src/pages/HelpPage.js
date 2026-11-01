import React from 'react';
import { useTranslation } from 'react-i18next';
import AppShell from '../components/AppShell';

export default function HelpPage() {
  const { t } = useTranslation();
  return (
    <AppShell active="help">
      <div className="pd-page-header">
        <h1>{t('help.title')}</h1>
        <p>{t('help.subtitle')}</p>
      </div>

      <div className="pd-faq">
        <h2>{t('help.gettingStartedTitle')}</h2>
        <div className="pd-faq-item">
          <h3>{t('help.unitsQuestion')}</h3>
          <p>{t('help.unitsAnswer')}</p>
        </div>
        <div className="pd-faq-item">
          <h3>{t('help.tenantSetupQuestion')}</h3>
          <p>{t('help.tenantSetupAnswer')}</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>{t('help.rentPaymentsTitle')}</h2>
        <div className="pd-faq-item">
          <h3>{t('help.collectRentQuestion')}</h3>
          <p>{t('help.collectRentAnswer')}</p>
        </div>
        <div className="pd-faq-item">
          <h3>{t('help.remindersQuestion')}</h3>
          <p>{t('help.remindersAnswer')}</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>{t('help.documentsMaintenanceTitle')}</h2>
        <div className="pd-faq-item">
          <h3>{t('help.filesQuestion')}</h3>
          <p>{t('help.filesAnswer')}</p>
        </div>
        <div className="pd-faq-item">
          <h3>{t('help.maintenanceQuestion')}</h3>
          <p>{t('help.maintenanceAnswer')}</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>{t('help.renewalsMessagesTitle')}</h2>
        <div className="pd-faq-item">
          <h3>{t('help.renewalSoonQuestion')}</h3>
          <p>{t('help.renewalSoonAnswer')}</p>
        </div>
        <div className="pd-faq-item">
          <h3>{t('help.textTenantQuestion')}</h3>
          <p>{t('help.textTenantAnswer')}</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>{t('help.plansBillingTitle')}</h2>
        <div className="pd-faq-item">
          <h3>{t('help.planIncludesQuestion')}</h3>
          <p>{t('help.planIncludesAnswer')}</p>
        </div>
        <div className="pd-faq-item">
          <h3>{t('help.exportDeleteQuestion')}</h3>
          <p>{t('help.exportDeleteAnswer')}</p>
        </div>
      </div>

      <div className="pd-faq">
        <h2>{t('help.stillStuckTitle')}</h2>
        <div className="pd-faq-item">
          <h3>{t('help.reachSupportQuestion')}</h3>
          <p>
            {t('help.reachSupportAnswerPrefix')} <a href="mailto:support@praedium.pro">support@praedium.pro</a> {t('help.reachSupportAnswerSuffix')}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
