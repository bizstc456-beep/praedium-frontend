import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/dashboard.css';

export default function NotFoundPage() {
  return (
    <div className="pd-auth-page">
      <div className="pd-auth-card" style={{ textAlign: 'center' }}>
        <div className="pd-auth-brand">Praedium</div>
        <div className="pd-auth-header">
          <h1>Page not found</h1>
          <p>The page you're looking for doesn't exist or may have moved.</p>
        </div>
        <Link to="/" className="pd-btn pd-btn-primary pd-btn-block">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
