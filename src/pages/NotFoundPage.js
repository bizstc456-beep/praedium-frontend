import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/dashboard.css';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="pd-auth-page">
      <div className="pd-auth-card" style={{ textAlign: 'center' }}>
        <div className="pd-auth-brand">Praedium</div>
        <div className="pd-auth-header">
          <h1>{t('notFound.title')}</h1>
          <p>{t('notFound.message')}</p>
        </div>
        <Link to="/" className="pd-btn pd-btn-primary pd-btn-block">
          {t('notFound.backToDashboard')}
        </Link>
      </div>
    </div>
  );
}
