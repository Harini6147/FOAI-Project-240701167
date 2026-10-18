import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { stats, trustScore, maskPhone, useDb } from '../services/store';
import { Stat, IncomeChart, rupees } from '../components/UI';
import { skillText, nameText } from '../utils/labels';
const Badge = () => { const { t } = useTranslation(); return <span className="inline-block bg-slate-800 text-white rounded-full px-3 py-1 text-sm">🔒 {t('readOnly')}</span>; };
export function PartnerHome() {
  const { t } = useTranslation(); const db = useDb();
  const rows = db.workers.map((w) => ({ w, s: stats(w.id, db), tr: trustScore(w, db).score }));
  return (<div className="space-y-4"><div className="flex items-center gap-3"><h2 className="text-2xl font-bold">🏦 {t('workers')}</h2><Badge /></div>
    <div className="grid grid-cols-3 gap-3"><Stat icon="👥" label={t('workers')} value={rows.length} /><Stat icon="💰" label={t('verifiedIncome')} value={rupees(rows.reduce((a, r) => a + r.s.total, 0))} /><Stat icon="⭐" label={t('trust')} value={Math.round(rows.reduce((a, r) => a + r.tr, 0) / rows.length)} /></div>
    {rows.map(({ w, s, tr }) => <Link key={w.id} to={`/partner/worker/${w.id}`} className="card block"><b>{nameText(w.name)}</b> · {skillText(w.workType)} · <span className="font-mono text-sm">{w.id}</span><br />⭐ {tr}/100 · {rupees(s.avgMonthly)}{t('perMonthShort')}</Link>)}</div>);
}
export function PartnerWorker() {
  const { t } = useTranslation(); const { id } = useParams(); const db = useDb(); const w = db.workers.find((x) => x.id === id);
  if (!w) return null; const s = stats(w.id, db), tr = trustScore(w, db);
  return (<div className="space-y-4"><div className="flex items-center gap-3"><h2 className="text-2xl font-bold">{t('creditProfile')}</h2><Badge /></div>
    <div className="card"><p className="font-mono">{w.id}</p><p>{skillText(w.workType)} · {w.experience} {t('yrs')} · {maskPhone(w.phone)}</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Stat icon="⭐" label={t('trust')} value={tr.score + '/100'} /><Stat icon="💰" label={t('avgMonthly')} value={rupees(s.avgMonthly)} /><Stat icon="🏠" label={t('employers')} value={new Set(s.conns.map((c) => c.clientId)).size} /><Stat icon="🧾" label={t('payments')} value={s.payments} /></div>
    <div className="card"><h3 className="font-bold mb-2">{t('income')}</h3><IncomeChart byMonth={s.byMonth} /></div></div>);
}
