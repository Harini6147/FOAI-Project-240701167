import { useCallback, useEffect, useRef, useState } from 'react';
import { getMessages, getUser, sendMessage, translateMessage, useDb } from '../services/store';
import { useTranslation } from 'react-i18next';
import { VoiceInput, SpeechButton } from './Voice';
import { nameText } from '../utils/labels';

const LANGUAGES = [
  { code: 'ta', name: 'Tamil' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
];

// Guess a message's language from its script so "come to job" is not treated as Tamil.
const SCRIPTS = [['ta', /[\u0B80-\u0BFF]/], ['hi', /[\u0900-\u097F]/], ['te', /[\u0C00-\u0C7F]/], ['ml', /[\u0D00-\u0D7F]/], ['kn', /[\u0C80-\u0CFF]/]];
const detectLang = (text, fallback) => SCRIPTS.find(([, re]) => re.test(text))?.[0] || (/[A-Za-z]/.test(text) ? 'en' : fallback);

export default function ChatPanel({ connectionId }) {
  const { t } = useTranslation();
  const db = useDb();
  const user = getUser(db);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [sourceLang, setSourceLang] = useState('ta');
  const [targetLang, setTargetLang] = useState('en');
  const [translations, setTranslations] = useState({});
  const [translatingId, setTranslatingId] = useState(null);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    const result = await getMessages(connectionId);
    if (result === null) { setLoadError(true); return; }
    setMessages(result); setLoadError(false); setLoading(false);
  }, [connectionId]);
  useEffect(() => { load(); const timer = setInterval(load, 2500); return () => clearInterval(timer); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const submit = async (e) => {
    e.preventDefault(); const body = draft.trim(); if (!body) return;
    const sent = await sendMessage(connectionId, body);
    if (!sent) { setError(t('chatSendErr')); return; }
    setMessages((old) => old.some((m) => m.id === sent.id) ? old : [...old, sent]);
    setDraft(''); setError('');
  };

  const translate = async (message) => {
    const from = detectLang(message.body, sourceLang);
    // If the message is already in the chosen target language, translate to English instead (or Tamil if it is English).
    const to = from !== targetLang ? targetLang : (from === 'en' ? 'ta' : 'en');
    const key = `${message.id}-${from}-${to}`;
    setTranslatingId(message.id); setError('');
    const result = await translateMessage(connectionId, message.body, from, to);
    if (!result.text) setError(result.error || t('trFailed'));
    else setTranslations((old) => ({ ...old, [`${message.id}`]: { text: result.text, to, from, key } }));
    setTranslatingId(null);
  };

  return <section className="rounded-2xl border border-slate-200 overflow-hidden" aria-label={t('chatAria')}>
    <div className="bg-indigo-50 px-4 py-3 flex items-center justify-between"><h3 className="font-bold text-lg">💬 {t('chatTitle')}</h3><span className="text-xs text-slate-600">{t('chatAuto')}</span></div>
    <div className="flex flex-wrap items-center gap-2 border-b bg-white px-3 py-3 text-sm">
      <span className="font-semibold">{t('chatTranslate')}</span>
      <label className="flex items-center gap-1">{t('trFrom', { defaultValue: 'From' })}
        <select className="input !min-h-[36px] !py-1" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} aria-label={t('trFrom', { defaultValue: 'From' })}>
          {LANGUAGES.map((lang) => <option key={lang.code} value={lang.code}>{t('lang_' + lang.code)}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1">{t('chatTo')}
        <select className="input !min-h-[36px] !py-1" value={targetLang} onChange={(e) => setTargetLang(e.target.value)} aria-label={t('chatTo')}>
          {LANGUAGES.map((lang) => <option key={lang.code} value={lang.code}>{t('lang_' + lang.code)}</option>)}
        </select>
      </label>
      <span className="text-xs text-slate-500">{t('chatHint')}</span>
    </div>
    <div className="p-3 space-y-2 bg-white max-h-72 overflow-y-auto">
      {loading && <p className="text-sm text-slate-500">{t('chatLoading')}</p>}
      {!loading && messages.length === 0 && <p className="text-sm text-slate-500 text-center py-5">{t('chatEmpty')}</p>}
      {messages.map((m) => {
        const mine = m.senderLogin === user?.login;
        const tr = translations[`${m.id}`];
        return <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[90%] rounded-2xl px-3 py-2 ${mine ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-900'}`}>
            <p className="text-xs font-semibold mb-1">{mine ? t('chatYou') : nameText(m.senderName)}</p>
            <p className="whitespace-pre-wrap break-words text-base">{m.body}</p>
            <div className="mt-1"><SpeechButton text={m.body} language={detectLang(m.body, sourceLang)} /></div>
            {tr && <div className={`mt-2 rounded-lg border p-2 ${mine ? 'border-indigo-400 bg-indigo-600' : 'border-slate-200 bg-white'}`}>
              <p className="text-[11px] font-semibold mb-1">{t('chatTranslationOf', { lang: t('lang_' + tr.to) })}</p>
              <p className="whitespace-pre-wrap break-words text-sm">{tr.text}</p>
            </div>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className={`text-[11px] ${mine ? 'text-indigo-100' : 'text-slate-500'}`}>{new Date(m.createdAt).toLocaleString()}</p>
              <button type="button" onClick={() => translate(m)} disabled={translatingId === m.id} className={`text-xs underline underline-offset-2 disabled:opacity-60 ${mine ? 'text-white' : 'text-indigo-700'}`}>
                {translatingId === m.id ? t('chatTranslating') : t('chatTranslateBtn')}
              </button>
            </div>
          </div>
        </div>;
      })}
      <div ref={bottomRef} />
    </div>
    {(error || loadError) && <p role="alert" className="px-3 py-2 text-sm text-red-700 bg-red-50">{error || t('chatLoadErr')}</p>}
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 p-3 bg-slate-50 border-t"><div className="flex-1 min-w-[180px]"><VoiceInput label={t('chatInput')} value={draft} onChange={setDraft} placeholder={t('chatPlaceholder')} maxLength={2000} language={sourceLang} /></div><button className="btn btn-primary !min-h-[44px] !px-4" type="submit" disabled={!draft.trim()}>{t('chatSend')}</button></form>
  </section>;
}
