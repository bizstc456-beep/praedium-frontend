import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fr from './locales/fr.json';

// EN/FR only for now. localStorage ('pd-language') is the source of truth
// once a user has picked a language explicitly (via the first-use prompt or
// the Settings toggle); browser language is only used before that choice
// has ever been made. Any string without a translation falls back to
// English automatically, so partially-translated pages never break.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'pd-language',
      caches: ['localStorage'],
    },
  });

export default i18n;
