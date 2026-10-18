import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signIn, signUp, getUser, useDb } from '../services/store';
import { VoiceInput } from '../components/Voice';
import { Listen } from '../components/UI';
export const home = (u) => (u ? (u.role === 'worker' ? '/worker' : u.role === 'client' ? '/client' : '/partner') : '/');
export function Landing() {
  const { t } = useTranslation(); const user = getUser(useDb());
  if (user) return <Navigate to={home(user)} />;
  const cards = [['✅', t('cardVerified')], ['💰', t('cardIncome')], ['⭐', t('cardTrust')], ['🤝', t('cardMatching')], ['🏦', t('cardFinance')], ['🏛️', t('cardSchemes')]];
  return (<div className="space-y-6"><section className="rounded-3xl bg-gradient-to-br from-ink via-indigo-700 to-leaf text-white p-8 text-center">
    <h1 className="text-3xl sm:text-5xl font-extrabold">{t('tagline')}</h1><p className="mt-3 max-w-xl mx-auto">{t('sub')}</p>
    <div className="flex flex-wrap gap-3 justify-center mt-6"><Link to="/signup?role=worker" className="btn bg-saffron text-black">👷 {t('worker')}</Link><Link to="/signup?role=client" className="btn bg-white text-ink">🏠 {t('client')}</Link><Link to="/signin" className="btn border-2 border-white text-white">{t('signIn')}</Link></div>
    <div className="mt-4 bg-white/20 inline-block rounded-xl px-2"><Listen text={t('tagline') + '. ' + t('sub')} /></div></section>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{cards.map(([i, l]) => <div key={l} className="card text-center"><div className="text-4xl">{i}</div><div className="font-semibold">{l}</div></div>)}</div></div>);
}
export function Auth({ mode }) {
  const { t } = useTranslation(); const nav = useNavigate();
  const [f, setF] = useState({ name: '', login: '', password: '', role: new URLSearchParams(location.search).get('role') || 'worker' });
  const [show, setShow] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const submit = async (e) => {
    e.preventDefault();
    if (mode === 'up' && (!f.name.trim() || !f.login.trim() || f.password.length < 6)) return setErr(t('weak'));
    setErr(''); const r = await (mode === 'up' ? signUp(f) : signIn(f.login, f.password));
    if (r.error) return setErr(t(r.error));
    nav(mode === 'up' && f.role !== 'partner' ? '/profile' : '/');
  };
  return (<form onSubmit={submit} className="card max-w-md mx-auto space-y-4"><h2 className="text-2xl font-bold">{t(mode === 'up' ? 'signUp' : 'signIn')}</h2>
    {mode === 'up' && <VoiceInput label={t('name')} value={f.name} onChange={set('name')} />}
    <label className="block"><span className="font-semibold">{t(mode === 'up' ? 'phone' : 'login')}</span><input className="input mt-1" value={f.login} onChange={(e) => set('login')(e.target.value)} /></label>
    <label className="block"><span className="font-semibold">{t('password')}</span><div className="flex gap-2 mt-1"><input className="input" type={show ? 'text' : 'password'} value={f.password} onChange={(e) => set('password')(e.target.value)} /><button type="button" className="btn btn-ghost" onClick={() => setShow(!show)}>{show ? '🙈' : '👁️'}</button></div></label>
    {mode === 'up' && <label className="block"><span className="font-semibold">{t('role')}</span><select className="input mt-1" value={f.role} onChange={(e) => set('role')(e.target.value)}><option value="worker">{t('worker')}</option><option value="client">{t('client')}</option><option value="partner">{t('partner')}</option></select></label>}
    {err && <p role="alert" className="text-red-700 font-semibold">⚠️ {err}</p>}
    <button className="btn btn-primary w-full">{t(mode === 'up' ? 'signUp' : 'signIn')}</button>
    {mode === 'in' && <p className="text-sm bg-amber-50 border border-amber-300 rounded-xl p-2">{t('demo')}</p>}
    <p className="text-center">{mode === 'in' ? <Link className="underline" to="/signup">{t('signUp')}</Link> : <Link className="underline" to="/signin">{t('signIn')}</Link>}</p></form>);
}
