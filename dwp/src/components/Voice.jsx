import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGS } from '../i18n';

const SPEECH_LOCALES = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', ml: 'ml-IN', kn: 'kn-IN',
  bn: 'bn-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', or: 'or-IN', ur: 'ur-IN'
};
export const speechLocale = (code = 'en') => SPEECH_LOCALES[code] || (LANGS.find((l) => l.code === code)?.speech) || 'en-IN';

export function speakText(text, language = 'en') {
  if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
    return { ok: false, message: i18n.t('ttsUnsupported') };
  }
  const value = String(text || '').trim();
  if (!value) return { ok: false, message: i18n.t('ttsNothing') };
  window.speechSynthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(value);
  utterance.lang = speechLocale(language);
  utterance.rate = 0.92;
  utterance.onerror = (event) => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') console.warn('Speech playback error:', event.error);
  };
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

export function SpeechButton({ text, language }) {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState('');
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  const speak = () => {
    const result = speakText(text, language || i18n.language);
    setError(result.ok ? '' : result.message);
  };
  return <span className="inline-flex flex-col items-start gap-1">
    <button type="button" onClick={speak} className="btn btn-ghost !min-h-[40px] !px-3 text-base" aria-label={t('listen')}>🔊 {t('listen')}</button>
    {error && <span role="alert" className="text-xs text-red-700 max-w-xs">{error}</span>}
  </span>;
}

// Plain labelled text input (the microphone / speak button has been removed).
export function VoiceInput({ value, onChange, label, language, ...rest }) {
  return <label className="block min-w-0">
    <span className="font-semibold">{label}</span>
    <div className="flex gap-2 mt-1 min-w-0">
      <input className="input min-w-0 flex-1" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  </label>;
}
