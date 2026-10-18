import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json'; import hi from './locales/hi.json'; import ta from './locales/ta.json';
export const LANGS = [{ code: 'en', name: 'English', speech: 'en-IN' }, { code: 'hi', name: 'हिन्दी', speech: 'hi-IN' }, { code: 'ta', name: 'தமிழ்', speech: 'ta-IN' }];
// To add a language: create src/locales/xx.json, import it here and add it to LANGS.
i18n.use(initReactI18next).init({ resources: { en: { translation: en }, hi: { translation: hi }, ta: { translation: ta } }, lng: localStorage.getItem('dwp_lang') || 'en', fallbackLng: 'en', interpolation: { escapeValue: false } });
const applyLang = (l) => { try { localStorage.setItem('dwp_lang', l); } catch { /* ignore */ } document.documentElement.lang = l; document.title = i18n.t('appTitle'); };
i18n.on('languageChanged', applyLang); applyLang(i18n.language);
export default i18n;
