import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pd-auth-page">
      <div className="pd-auth-card">
        <div className="pd-auth-brand">Praedium</div>
        <div className="pd-auth-header">
          <h1>Reset your password</h1>
          <p>Enter your email and we'll send you a link to reset it.</p>
        </div>
        {sent ? (
          <div>
            <div className="pd-alert-success">
              If an account exists for {email}, a reset link is on its way. Check your inbox (and spam folder).
            </div>
            <div className="pd-auth-footer">
              <p><Link to="/login">Back to sign in</Link></p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="pd-alert-danger">{error}</div>}
            <div className="pd-field">
              <label>Email</label>
              <input
                className="pd-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <button type="submit" className="pd-btn pd-btn-primary pd-btn-block" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <div className="pd-auth-footer">
              <p><Link to="/login">Back to sign in</Link></p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
