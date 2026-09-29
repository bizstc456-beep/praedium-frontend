import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/dashboard.css';

export default function NotFoundPage() {
  return (
    <div className="rf-auth-page">
      <div className="rf-auth-card" style={{ textAlign: 'center' }}>
        <div className="rf-auth-brand">Rentflow</div>
        <div className="rf-auth-header">
          <h1>Page not found</h1>
          <p>The page you're looking for doesn't exist or may have moved.</p>
        </div>
        <Link to="/" className="rf-btn rf-btn-primary rf-btn-block">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
