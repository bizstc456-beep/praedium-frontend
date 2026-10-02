import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import '../styles/dashboard.css';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Reached via the landlord's "invite to portal" email. Supabase's invite
// link, once clicked, establishes a session and fires either SIGNED_IN or
// PASSWORD_RECOVERY depending on flow -- either one means it's safe to show
// the "set a password" form and call updateUser(). Same pattern as the
// landlord ResetPasswordPage, extended to cover both event names.
export default function TenantSetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    // Covers the case where the session was already established (and the
    // event already fired) before this listener attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription?.unsubscribe();
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setSuccess(true);
        setTimeout(() => navigate('/tenant'), 2000);
      }
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
          <h1>Set up your portal login</h1>
          <p>Choose a password to access your tenant portal.</p>
        </div>

        {success ? (
          <div className="pd-auth-footer">Password set — taking you to your portal...</div>
        ) : ready ? (
          <form onSubmit={handleSetPassword}>
            {error && <div className="pd-alert-danger">{error}</div>}
            <div className="pd-field">
              <label>New password</label>
              <input
                className="pd-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="pd-field">
              <label>Confirm password</label>
              <input
                className="pd-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="pd-btn pd-btn-primary pd-btn-block" disabled={loading}>
              {loading ? 'Saving...' : 'Set password & continue'}
            </button>
          </form>
        ) : (
          <div>
            <div className="pd-alert-danger">
              This invite link is invalid or has expired.
            </div>
            <div className="pd-auth-footer">
              <p>Ask your landlord to resend your portal invite.</p>
              <p><Link to="/tenant/login">Back to sign in</Link></p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
