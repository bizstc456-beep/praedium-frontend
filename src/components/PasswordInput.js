import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.3 4.3a13.6 13.6 0 0 0-1.8 2.3S4.5 12 10 12c.8 0 1.6-.12 2.3-.33" />
      <path d="M7.6 4.4A8.8 8.8 0 0 1 10 4c5.5 0 8.5 6 8.5 6a14 14 0 0 1-2 2.5" />
      <path d="M8 8.3a2.3 2.3 0 0 0 3.2 3.2" />
      <path d="M2 2l16 16" />
    </svg>
  );
}

// Drop-in replacement for <input type="password">, used everywhere a
// landlord or tenant types a password (register, login, reset, tenant set
// password) so the show/hide behavior and icon are identical across all
// of them rather than each page inventing its own.
export default function PasswordInput({ id, className = 'pd-input', value, onChange, placeholder, required, autoComplete, ...rest }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <div className="pd-password-field">
      <input
        id={id}
        className={className}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        className="pd-password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        tabIndex={-1}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
