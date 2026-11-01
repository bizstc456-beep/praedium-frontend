import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/dashboard.css';
import '../styles/legal.css';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <div className="pd-legal-page">
      <div className="pd-legal-card">
        <div className="pd-legal-brand">Praedium</div>
        <h1>{t('privacyPolicy.title')}</h1>
        <p className="pd-legal-updated">{t('privacyPolicy.lastUpdated')}</p>

        <section>
          <h2>{t('privacyPolicy.section1Title')}</h2>
          <p>{t('privacyPolicy.section1Para1')}</p>
          <p>
            {t('privacyPolicy.section1Para2Prefix')}{' '}
            <a href="mailto:support@praedium.pro">support@praedium.pro</a>.
          </p>
        </section>

        <section>
          <h2>{t('privacyPolicy.section2Title')}</h2>
          <table className="pd-legal-table">
            <thead>
              <tr><th>{t('privacyPolicy.section2TableHeaderWhat')}</th><th>{t('privacyPolicy.section2TableHeaderWhy')}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>{t('privacyPolicy.section2Row1What')}</td>
                <td>{t('privacyPolicy.section2Row1Why')}</td>
              </tr>
              <tr>
                <td>{t('privacyPolicy.section2Row2What')}</td>
                <td>{t('privacyPolicy.section2Row2Why')}</td>
              </tr>
              <tr>
                <td>{t('privacyPolicy.section2Row3What')}</td>
                <td>{t('privacyPolicy.section2Row3Why')}</td>
              </tr>
              <tr>
                <td>{t('privacyPolicy.section2Row4What')}</td>
                <td>{t('privacyPolicy.section2Row4Why')}</td>
              </tr>
              <tr>
                <td>{t('privacyPolicy.section2Row5What')}</td>
                <td>{t('privacyPolicy.section2Row5Why')}</td>
              </tr>
              <tr>
                <td>{t('privacyPolicy.section2Row6What')}</td>
                <td>{t('privacyPolicy.section2Row6Why')}</td>
              </tr>
              <tr>
                <td>{t('privacyPolicy.section2Row7What')}</td>
                <td>{t('privacyPolicy.section2Row7Why')}</td>
              </tr>
            </tbody>
          </table>
          <p>{t('privacyPolicy.section2Para2')}</p>
        </section>

        <section>
          <h2>{t('privacyPolicy.section3Title')}</h2>
          <p>{t('privacyPolicy.section3Intro')}</p>
          <ul>
            <li>{t('privacyPolicy.section3Item1')}</li>
            <li>{t('privacyPolicy.section3Item2')}</li>
            <li>{t('privacyPolicy.section3Item3')}</li>
            <li>{t('privacyPolicy.section3Item4')}</li>
            <li>{t('privacyPolicy.section3Item5')}</li>
            <li>{t('privacyPolicy.section3Item6')}</li>
          </ul>
          <p>
            <strong>{t('privacyPolicy.section3Para2Label')}</strong> {t('privacyPolicy.section3Para2')}
          </p>
          <p>{t('privacyPolicy.section3Para3')}</p>
        </section>

        <section>
          <h2>{t('privacyPolicy.section4Title')}</h2>
          <p>{t('privacyPolicy.section4Para1')}</p>
          <p>{t('privacyPolicy.section4Para2')}</p>
          <p>{t('privacyPolicy.section4Para3')}</p>
        </section>

        <section>
          <h2>{t('privacyPolicy.section5Title')}</h2>
          <p>{t('privacyPolicy.section5Para1')}</p>
          <p>
            {t('privacyPolicy.section5Para2Prefix')}{' '}
            <a href="mailto:support@praedium.pro">support@praedium.pro</a>.
          </p>
          <p>{t('privacyPolicy.section5Para3')}</p>
        </section>

        <section>
          <h2>{t('privacyPolicy.section6Title')}</h2>
          <p>
            <strong>{t('privacyPolicy.section6LocalStorageLabel')}</strong> {t('privacyPolicy.section6LocalStorage')}
          </p>
          <p>
            <strong>{t('privacyPolicy.section6ChildrenLabel')}</strong> {t('privacyPolicy.section6Children')}
          </p>
          <p>
            <strong>{t('privacyPolicy.section6ChangesLabel')}</strong> {t('privacyPolicy.section6Changes')}
          </p>
          <p>
            <strong>{t('privacyPolicy.section6ContactLabel')}</strong>{' '}
            {t('privacyPolicy.section6ContactPrefix')}{' '}
            <a href="mailto:support@praedium.pro">support@praedium.pro</a>.
          </p>
        </section>

        <div className="pd-legal-footer">
          <Link to="/">{t('privacyPolicy.backToPraedium')}</Link>
        </div>
      </div>
    </div>
  );
}
