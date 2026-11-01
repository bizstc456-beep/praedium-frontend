import React from 'react';
import { useTranslation } from 'react-i18next';

// Simple EN / FR switch. Changing it updates the UI language immediately
// (i18next also caches the choice to localStorage under 'pd-language'
// automatically). Pass onChange to also persist the choice to the backend
// for a logged-in landlord or tenant, so it follows them across devices.
export default function LanguageToggle({ onChange, className }) {
  const { i18n } = useTranslation();
  const current = i18n.language && i18n.language.startsWith('fr') ? 'fr' : 'en';

  const pick = (lang) => {
    if (lang === current) return;
    i18n.changeLanguage(lang);
    if (onChange) onChange(lang);
  };

  return (
    <div className={`pd-lang-toggle${className ? ` ${className}` : ''}`} role="group" aria-label="Language / Langue">
      <button
        type="button"
        className={current === 'en' ? 'pd-lang-option current' : 'pd-lang-option'}
        onClick={() => pick('en')}
        aria-pressed={current === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        className={current === 'fr' ? 'pd-lang-option current' : 'pd-lang-option'}
        onClick={() => pick('fr')}
        aria-pressed={current === 'fr'}
      >
        FR
      </button>
    </div>
  );
}
