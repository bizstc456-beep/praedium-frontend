import React from 'react';
import { useTranslation } from 'react-i18next';

// Shown exactly once to a brand new landlord or tenant whose account has no
// language preference saved yet (preferred_language is null on their row).
// Deliberately bilingual on its own -- we don't know their language yet, so
// both options are always spelled out. The caller (AppShell / TenantShell)
// decides when to render this and persists the choice to the backend.
export default function LanguagePrompt({ onSelect }) {
  const { i18n } = useTranslation();

  const pick = (lang) => {
    i18n.changeLanguage(lang);
    onSelect(lang);
  };

  return (
    <div className="pd-modal-backdrop" role="dialog" aria-modal="true" aria-label="Choose your language / Choisissez votre langue">
      <div className="pd-modal pd-lang-modal">
        <h2 className="pd-lang-modal-title">
          Choose your language
          <br />
          Choisissez votre langue
        </h2>
        <p className="pd-lang-modal-sub">
          You can change this anytime in Settings.
          <br />
          Vous pouvez le changer en tout temps dans les paramètres.
        </p>
        <div className="pd-lang-modal-options">
          <button type="button" className="pd-btn pd-btn-primary" onClick={() => pick('en')}>
            English
          </button>
          <button type="button" className="pd-btn pd-btn-primary" onClick={() => pick('fr')}>
            Français
          </button>
        </div>
      </div>
    </div>
  );
}
