import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SpeechButton } from './Voice';
import { skillText, nameText, commentText, statusText, pathText, LOCALES } from '../utils/labels';
export const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const Stat = ({ label, value, icon }) => (<div className="card text-center"><div className="text-3xl" aria-hidden>{icon}</div><div className="text-2xl font-extrabold text-ink">{value}</div><div className="text-slate-600 text-base">{label}</div></div>);
export const Empty = ({ icon = '📭', text }) => (<div className="card text-center text-slate-600"><div className="text-5xl">{icon}</div><p className="mt-2">{text}</p></div>);
export function IdCard({ label, id }) {
  const { t } = useTranslation(); const [ok, setOk] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(id); setOk(true); setTimeout(() => setOk(false), 1500); };
  const share = () => (navigator.share ? navigator.share({ title: label, text: `${label}: ${id}` }) : copy());
  return (<div className="rounded-3xl bg-gradient-to-br from-ink to-indigo-700 text-white p-6 shadow-lg">
    <div className="opacity-80">{label}</div><div className="text-2xl sm:text-3xl font-mono font-bold break-all">{id}</div>
    <div className="flex gap-2 mt-4"><button className="btn bg-white text-ink" onClick={copy}>{ok ? '✅ ' + t('copied') : '📋 ' + t('copy')}</button><button className="btn bg-saffron text-black" onClick={share}>📤</button></div></div>);
}
export function TrustCard({ trust }) {
  const { t } = useTranslation();
  return (<div className="card"><div className="flex items-center gap-4"><div className="w-24 h-24 rounded-full grid place-items-center text-2xl font-extrabold text-ink" style={{ background: `conic-gradient(#0F9D6B ${trust.score * 3.6}deg,#e2e8f0 0)` }}><span className="bg-white rounded-full w-[72px] h-[72px] grid place-items-center">{trust.score}/100</span></div>
    <div><h3 className="text-xl font-bold">{t('trust')}</h3></div></div>
    <ul className="mt-3 space-y-1 text-base">{trust.parts.map(([k, v]) => (<li key={k} className="flex items-center gap-2"><span className="w-28 capitalize">{t('tr' + k.charAt(0).toUpperCase() + k.slice(1), { defaultValue: k })}</span><span className="flex-1 h-2 bg-slate-200 rounded"><span className="block h-2 bg-leaf rounded" style={{ width: `${Math.min(100, v * 4)}%` }} /></span></li>))}</ul></div>);
}
export function IncomeChart({ byMonth }) {
  const { t, i18n } = useTranslation();
  const entries = Object.entries(byMonth).sort(), max = Math.max(1, ...entries.map((e) => e[1]));
  const label = (m) => new Date(m + '-01').toLocaleString(LOCALES[i18n.language] || 'en-IN', { month: 'short', year: '2-digit' });
  return (<div className="overflow-x-auto"><div className="flex items-end justify-center gap-3 h-56 min-w-fit" role="img" aria-label={t('monthlyIncome')}>
    {entries.map(([m, v]) => (<div key={m} className="flex flex-col justify-end items-center h-full w-20 shrink-0">
      <span className="text-sm font-bold text-ink">{rupees(v)}</span>
      <div className="w-full bg-leaf rounded-t-lg mt-1" style={{ height: `${Math.max(8, (v / max) * 70)}%` }} />
      <span className="text-sm mt-1 text-slate-600">{label(m)}</span></div>))}</div></div>);
}
export const Stars = ({ value, onChange }) => { const { t } = useTranslation(); return (<div role="radiogroup">{[1, 2, 3, 4, 5].map((n) => (<button type="button" key={n} aria-label={t('stars', { n })} onClick={() => onChange?.(n)} className={`text-3xl ${n <= value ? 'text-saffron' : 'text-slate-300'}`}>★</button>))}</div>); };
export const Listen = ({ text }) => <SpeechButton text={text} />;

export function MatchResult({ m }) {
  const { t } = useTranslation();
  return (<div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-3 text-base space-y-1">
    <p className="font-bold">{t('astarPath')}</p><p className="font-mono break-words">{m.labels.map(pathText).join(' → ')}</p>
    <p>{t('matchCost')}: <b>{m.cost}</b> · {t('compat')}: <b>{m.percent}%</b></p>
    <p className="font-bold pt-1">{t('cspTitle')}</p><p>✅ {t('cspChecked')}: {m.csp.checked} · {m.csp.passed}/{m.csp.checked} ✓</p></div>);
}
export function ConnectionCard({ cn, client, worker }) {
  const { t } = useTranslation();
  return (<div className="rounded-2xl border-2 border-leaf bg-emerald-50/50 p-4 space-y-2">
    <p className="font-bold text-leaf">✅ {t('connected')}</p>
    <p className="font-mono text-sm break-all">{client?.id} ⟶ {worker?.id}</p>
    <p><b>{nameText(client?.name)}</b> ↔ <b>{nameText(worker?.name)}</b> · {skillText(cn.job)}</p>
    <p>{t('startDate')}: {cn.start} · {rupees(cn.salary)}/mo · {cn.status === 'Active' ? '🟢' : '⚪'} {statusText(cn.status)}</p>
    {cn.match && <MatchResult m={cn.match} />}
    {cn.ratings.map((x, i) => <p key={i} className="text-base">{'★'.repeat(x.stars)} “{commentText(x.comment)}” · {x.date}</p>)}</div>);
}
export function FlashCard({ front, back }) {
  const { t } = useTranslation();
  const [flip, setFlip] = useState(false);
  return (<button type="button" aria-label={t('flipCard')} onClick={() => setFlip(!flip)} className="h-32 w-full" style={{ perspective: '800px' }}>
    <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d', transition: 'transform .5s', transform: flip ? 'rotateY(180deg)' : 'none' }}>
      <div className="absolute inset-0 card grid place-items-center font-bold text-ink" style={{ backfaceVisibility: 'hidden' }}>{front}</div>
      <div className="absolute inset-0 rounded-3xl bg-ink text-white p-4 grid place-items-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{back}</div></div></button>);
}
