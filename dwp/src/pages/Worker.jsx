import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, profileOf, stats, trustScore, maskPhone, useDb } from '../services/store';
import { matchSchemes, VERIFIED_ON } from '../data/schemes';
import { IdCard, Stat, TrustCard, IncomeChart, Empty, rupees, Listen, ConnectionCard } from '../components/UI';
import ChatPanel from '../components/ChatPanel';
import { skillList, nameText, commentText, placeText, statusText, genderText, levelText, skillText } from '../utils/labels';
export function WorkerHome() {
  const { t } = useTranslation(); const db = useDb(); const w = profileOf(getUser(db), db);
  if (!w) return <Navigate to="/profile" />;
  const s = stats(w.id, db), trust = trustScore(w, db);
  return (<div className="space-y-4">
    <IdCard label={t('passportId')} id={w.id} />
    <div className="card"><h2 className="text-2xl font-bold">{nameText(w.name)}</h2><p>{skillText(w.workType)} · {placeText(w.location)}, {placeText(w.state)} · {w.experience} {t('yrs')} · {maskPhone(w.phone)}</p><p>🛠️ {skillList(w.skills)}</p>
      <Listen text={t('summaryWorker', { total: s.total, score: trust.score })} /></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Stat icon="💰" label={t('total')} value={rupees(s.total)} /><Stat icon="📅" label={t('avgMonthly')} value={rupees(s.avgMonthly)} /><Stat icon="🧾" label={t('payments')} value={s.payments} /><Stat icon="💼" label={t('activeJobs')} value={s.active} /></div>
    <div className="grid md:grid-cols-2 gap-4"><TrustCard trust={trust} /><div className="card"><h3 className="text-xl font-bold mb-2">{t('income')}</h3>{s.payments ? <IncomeChart byMonth={s.byMonth} /> : <Empty icon="💸" text={t('emptyTx')} />}</div></div>
    <div className="card space-y-3"><h3 className="text-xl font-bold">🤝 {t('connections')}</h3>{s.conns.length ? s.conns.map((c) => <div key={c.id} className="space-y-3"><ConnectionCard cn={c} client={db.clients.find((x) => x.id === c.clientId)} worker={w} />{c.status === 'Active' && <ChatPanel connectionId={c.id} />}</div>) : <Empty icon="🤝" text={t('emptyConn')} />}</div>
    <div className="card"><h3 className="text-xl font-bold mb-2">🧾 {t('payments')}</h3>{s.txns.length ? [...s.txns].reverse().map((x) => <div key={x.id} className="border-b py-2 text-base"><div className="flex justify-between font-semibold"><span>{statusText(x.type)}</span><span>{rupees(x.amount)} ✅ {statusText(x.status)}</span></div><div className="text-slate-600 font-mono text-sm break-all">{x.id} · {x.date} · {x.clientId} → {x.workerId}</div></div>) : <Empty icon="💸" text={t('emptyTx')} />}</div>
  </div>);
}
export function Schemes() {
  const { t } = useTranslation(); const db = useDb(); const w = profileOf(getUser(db), db);
  if (!w) return <Navigate to="/profile" />;
  const income = stats(w.id, db).avgMonthly || w.expectedSalary;
  const list = matchSchemes(w, income);
  const sch = (s, f) => t(`sch.${s.id}.${f}`, { defaultValue: s[f] });
  const schList = (s, f) => { const r = t(`sch.${s.id}.${f}`, { returnObjects: true }); return Array.isArray(r) ? r : s[f]; };
  return (<div className="space-y-4"><h2 className="text-2xl font-bold">🏛️ {t('schemeCount', { n: list.length })}</h2>
    <p className="card text-base">{t('basedOn')}: {genderText(w.gender) || '—'} · {t('age')} {w.age} · {placeText(w.state)} · ₹{Math.round(income).toLocaleString('en-IN')}/{t('perMonth')}</p>
    {list.map((s) => (<div key={s.id} className="card space-y-2"><p className="text-sm font-semibold text-leaf">{levelText(s.level)}</p><h3 className="text-xl font-bold">{sch(s, 'name')}</h3><p className="text-slate-600">{sch(s, 'dept')}</p>
      <p>💰 {sch(s, 'benefit')}</p>
      <div><p className="font-bold">{t('whyQualify')}</p><ul>{s.why.map((x) => <li key={x.k}>✅ {t(x.k, { ...x.p, gender: genderText(x.p?.gender), state: placeText(x.p?.state) })}</li>)}</ul></div>
      <div><p className="font-bold">{t('confirmYourself')}</p><ul>{schList(s, 'manual').map((x) => <li key={x}>⬜ {x}</li>)}</ul></div>
      <div><p className="font-bold">📄 {t('docs')}</p><ul className="list-disc ml-6">{schList(s, 'docs').map((d) => <li key={d}>{d}</li>)}</ul></div>
      <p>📝 {sch(s, 'apply')}</p>
      <a className="underline text-ink font-semibold break-all" href={s.link} target="_blank" rel="noreferrer">{t('official')}: {s.link}</a>
      <p className="text-sm text-slate-500">{t('lastChecked')}: {t('verifiedOn', { defaultValue: VERIFIED_ON })}</p><Listen text={`${sch(s, 'name')}. ${sch(s, 'benefit')}`} /></div>))}
    {!list.length && <Empty icon="🏛️" text={t('empty')} />}</div>);
}
