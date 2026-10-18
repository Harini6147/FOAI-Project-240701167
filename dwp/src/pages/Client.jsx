import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addRating, addTxn, connect, getUser, profileOf, trustOf, useDb } from '../services/store';
import { findMatches } from '../services/matching';
import { HARD_CONSTRAINTS } from '../algorithms/csp';
import { VoiceInput } from '../components/Voice';
import { parseSkills } from '../utils/skills';
import { IdCard, Stat, Empty, Stars, rupees, MatchResult, ConnectionCard, FlashCard } from '../components/UI';
import ChatPanel from '../components/ChatPanel';
import { skillText, skillList, nameText, placeText, statusText, pathText } from '../utils/labels';
const CLABEL = { category: 'clabelCategory', availability: 'clabelAvailability', location: 'clabelLocation', salary: 'clabelSalary' };
const CARDS = [['fc1q', 'fc1a'], ['fc2q', 'fc2a'], ['fc3q', 'fc3a'], ['fc4q', 'fc4a']];
export function ClientHome() {
  const { t } = useTranslation(); const db = useDb(); const user = getUser(db); const c = profileOf(user, db);
  const [job, setJob] = useState({ skills: '', minExp: 0, maxSalary: 15000 }); const [res, setRes] = useState(null); const [msg, setMsg] = useState('');
  if (!c) return <Navigate to="/profile" />;
  const mine = db.connections.filter((x) => x.clientId === c.id);
  const run = () => setRes(findMatches(db.workers, { skills: parseSkills(job.skills), minExp: +job.minExp, maxSalary: +job.maxSalary, location: c.location, state: c.state }, trustOf));
  const doConnect = async (r) => {
    const ok = await connect(c.id, r.worker, r.labels[1], r.worker.expectedSalary, { labels: r.labels, cost: r.cost, percent: r.percent, csp: { checked: res.checked, passed: res.checked } });
    setMsg(ok ? `${t('connected')}: ${nameText(r.worker.name)}` : `${nameText(r.worker.name)}: ${t('connected')}`);
  };
  return (<div className="space-y-4"><IdCard label={t('ownershipId')} id={c.id} />
    <div className="grid grid-cols-3 gap-3"><Stat icon="👷" label={t('activeJobs')} value={mine.filter((x) => x.status === 'Active').length} /><Stat icon="💳" label={t('payments')} value={rupees(db.txns.filter((x) => x.clientId === c.id).reduce((s, x) => s + x.amount, 0))} /><Stat icon="📍" label={t('location')} value={placeText(c.location)} /></div>
    <div className="card space-y-3"><h2 className="text-xl font-bold">🔎 {t('findWorkers')}</h2><VoiceInput label={t('jobNeeds')} value={job.skills} onChange={(v) => setJob({ ...job, skills: v })} placeholder={t('skillsPlaceholder')} />
      {parseSkills(job.skills).length > 0 && <p className="text-base text-leaf font-semibold">✅ {t('detectedSkills')}: {skillList(parseSkills(job.skills))}</p>}
      <label className="block">{t('minExp')}<input type="number" className="input" value={job.minExp} onChange={(e) => setJob({ ...job, minExp: e.target.value })} /></label>
      <label className="block">{t('maxPay')}<input type="number" className="input" value={job.maxSalary} onChange={(e) => setJob({ ...job, maxSalary: e.target.value })} /></label>
      <button className="btn btn-primary" onClick={run}>{t('search')}</button></div>
    {msg && <p role="status" className="bg-emerald-100 border border-emerald-500 rounded-xl p-3 font-semibold">✅ {msg}</p>}
    {res && <>
      <div className="card space-y-3"><h2 className="text-xl font-bold">🧠 {t('matchIntel')}</h2>
        <div><h3 className="font-bold">{t('cspTitle')}</h3><p>{t('cspChecked')}: {res.checked}</p>
          <ul>{HARD_CONSTRAINTS.map((k) => <li key={k.key}>✓ {t(CLABEL[k.key])}</li>)}</ul>
          <p className="font-semibold">{t('cspCompatible')}: {res.results.length}</p>
          {res.rejected.map((x) => <p key={x.worker.id} className="text-base text-slate-600">❌ {t('cspRejected')}: {nameText(x.worker.name)} ({x.failed.map((k) => t(CLABEL[k])).join(', ')})</p>)}</div>
        {res.results[0] && <div><h3 className="font-bold">{t('astarPath')} ({nameText(res.results[0].worker.name)})</h3><p className="font-mono">{res.results[0].labels.map(pathText).join(' → ')}</p><p>{t('matchCost')}: <b>{res.results[0].cost}</b> · {t('compat')}: <b>{res.results[0].percent}%</b></p></div>}
        <p className="text-sm text-slate-600">{t('flashHint')}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{CARDS.map(([f, b]) => <FlashCard key={f} front={t(f)} back={t(b)} />)}</div></div>
      <p className="font-bold">{t('compatible', { n: res.results.length, c: res.checked })}</p>{!res.results.length && <Empty icon="🔍" text={t('empty')} />}
      {res.results.map((r) => (<div key={r.worker.id} className="card space-y-2"><div className="flex flex-wrap items-center gap-3"><div className="flex-1 min-w-[200px]"><h3 className="text-xl font-bold">{nameText(r.worker.name)} <span className="text-leaf">{r.percent}% {t('match')}</span></h3>
        <p>{skillText(r.worker.workType)} · {placeText(r.worker.location)} · {r.worker.experience} {t('yrs')} · {rupees(r.worker.expectedSalary)}</p><p className="text-sm font-mono">{r.worker.id}</p><p className="text-base">⭐ {t('trust')} {r.trust}/100 · 🟢 {statusText(r.worker.availability)}</p></div>
        <button className="btn btn-primary" onClick={() => doConnect(r)}>🤝 {t('connect')}</button></div>
        <MatchResult m={{ labels: r.labels, cost: r.cost, percent: r.percent, csp: { checked: res.checked, passed: res.checked } }} /></div>))}</>}</div>);
}
export function Connections() {
  const { t } = useTranslation(); const db = useDb(); const c = profileOf(getUser(db), db);
  const [amt, setAmt] = useState({}); const [rate, setRate] = useState({});
  if (!c) return <Navigate to="/profile" />;
  const mine = db.connections.filter((x) => x.clientId === c.id);
  if (!mine.length) return <Empty icon="🤝" text={t('emptyConn')} />;
  return (<div className="space-y-4">{mine.map((cn) => { const w = db.workers.find((x) => x.id === cn.workerId); const r = rate[cn.id] || { stars: 5, comment: '' };
    return (<div key={cn.id} className="card space-y-3"><ConnectionCard cn={cn} client={c} worker={w} />
      {cn.status === 'Active' && <ChatPanel connectionId={cn.id} />}
      {db.txns.filter((x) => x.clientId === c.id && x.workerId === w.id).slice(-3).map((x) => <p key={x.id} className="text-base">🧾 {x.id} · {x.date} · {rupees(x.amount)} · ✅ {statusText(x.status)}</p>)}
      <div className="flex gap-2"><input type="number" className="input" placeholder={t('amount')} value={amt[cn.id] ?? cn.salary} onChange={(e) => setAmt({ ...amt, [cn.id]: e.target.value })} /><button className="btn btn-primary" onClick={() => addTxn(cn, amt[cn.id] ?? cn.salary, 'Monthly Salary')}>💳 {t('record')}</button></div>
      <div><p className="font-semibold">{t('rate')}</p><Stars value={r.stars} onChange={(n) => setRate({ ...rate, [cn.id]: { ...r, stars: n } })} />
        <VoiceInput label={t('comment')} value={r.comment} onChange={(v) => setRate({ ...rate, [cn.id]: { ...r, comment: v } })} /><button className="btn btn-ghost mt-2" onClick={() => { addRating(cn.id, r.stars, r.comment); setRate({ ...rate, [cn.id]: { stars: 5, comment: '' } }); }}>{t('submit')}</button></div></div>); })}</div>);
}
