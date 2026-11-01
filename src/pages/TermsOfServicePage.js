import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/dashboard.css';
import '../styles/legal.css';

export default function TermsOfServicePage() {
  const { t } = useTranslation();
  return (
    <div className="pd-legal-page">
      <div className="pd-legal-card">
        <div className="pd-legal-brand">Praedium</div>
        <h1>{t('termsOfService.title')}</h1>
        <p className="pd-legal-updated">{t('termsOfService.lastUpdated')}</p>

        <section>
          <h2>{t('termsOfService.section1Title')}</h2>
          <p>{t('termsOfService.section1Para1')}</p>
          <p>{t('termsOfService.section1Para2')}</p>
        </section>

        <section>
          <h2>{t('termsOfService.section2Title')}</h2>
          <p>{t('termsOfService.section2Para1')}</p>
          <p>{t('termsOfService.section2Para2')}</p>
        </section>

        <section>
          <h2>{t('termsOfService.section3Title')}</h2>
          <p>{t('termsOfService.section3Para1')}</p>
          <p>
            <strong>{t('termsOfService.section3Para2')}</strong>
          </p>
          <p>{t('termsOfService.section3Para3')}</p>
        </section>

        <section>
          <h2>{t('termsOfService.section4Title')}</h2>
          <p>{t('termsOfService.section4Intro')}</p>
          <ul>
            <li>{t('termsOfService.section4Item1')}</li>
            <li>{t('termsOfService.section4Item2')}</li>
            <li>{t('termsOfService.section4Item3')}</li>
            <li>{t('termsOfService.section4Item4')}</li>
            <li>{t('termsOfService.section4Item5')}</li>
          </ul>
          <p>{t('termsOfService.section4Para2')}</p>
        </section>

        <section>
          <h2>{t('termsOfService.section5Title')}</h2>
          <p>{t('termsOfService.section5Intro')}</p>
          <table className="pd-legal-table">
            <thead>
              <tr><th>{t('termsOfService.section5TableHeaderProvider')}</th><th>{t('termsOfService.section5TableHeaderUse')}</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase</td><td>{t('termsOfService.section5RowSupabase')}</td></tr>
              <tr><td>Stripe</td><td>{t('termsOfService.section5RowStripe')}</td></tr>
              <tr><td>Twilio</td><td>{t('termsOfService.section5RowTwilio')}</td></tr>
              <tr><td>Anthropic (Claude)</td><td>{t('termsOfService.section5RowAnthropic')}</td></tr>
              <tr><td>Railway / Vercel</td><td>{t('termsOfService.section5RowHosting')}</td></tr>
            </tbody>
          </table>
          <p>{t('termsOfService.section5Para2')}</p>
        </section>

        <section>
          <h2>{t('termsOfService.section6Title')}</h2>
          <p>{t('termsOfService.section6Para1')}</p>
          <p>{t('termsOfService.section6Para2')}</p>
        </section>

        <section>
          <h2>{t('termsOfService.section7Title')}</h2>
          <p>{t('termsOfService.section7Para1')}</p>
          <p>{t('termsOfService.section7Para2')}</p>
          <p>
            {t('termsOfService.section7Para3Prefix')}{' '}
            <a href="mailto:support@praedium.pro">support@praedium.pro</a>.
          </p>
        </section>

        <div className="pd-legal-footer">
          <Link to="/">{t('termsOfService.backToPraedium')}</Link>
        </div>
      </div>
    </div>
  );
}
