import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGS } from '../i18n';
import { getUser, signOut, useDb, resetDemo } from '../services/store';
import { speakText } from './Voice';
const NAV = { worker: [['/worker', '🪪', 'passportId'], ['/worker/schemes', '🏛️', 'schemes']], client: [['/client', '🔎', 'findWorkers'], ['/client/connections', '🤝', 'connections']], partner: [['/partner', '🏦', 'workers']] };
export default function Layout() {
  const { t, i18n } = useTranslation(); const db = useDb(); const user = getUser(db);
  return (<div className="min-h-screen pb-24 md:pb-8">
    <header className="bg-white shadow-sm sticky top-0 z-10"><div className="max-w-5xl mx-auto flex items-center gap-3 p-3">
      <Link to="/" className="font-extrabold text-ink text-xl">🪪 {t('appTitle')}</Link><div className="flex-1" />
      <button type="button" className="btn btn-ghost !min-h-[40px] !px-3" onClick={() => { const text = document.querySelector('main')?.innerText || document.body.innerText; const result = speakText(text, i18n.language); if (!result.ok) window.alert(result.message); }} title={t('readPageTitle')}>🔊 {t('readPage')}</button>
      <select aria-label={t('languageLabel')} className="input !w-auto" value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>{LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</select>
      {user && <button className="btn btn-ghost !min-h-[40px]" onClick={signOut}>{t('signOut')}</button>}</div></header>
    <main className="max-w-5xl mx-auto p-4">{db.error && <p role="alert" className="mb-3 bg-red-50 border border-red-400 rounded-xl p-3 font-semibold">⚠️ {t('network')}</p>}<Outlet /></main>
    {user && <nav className="fixed bottom-0 inset-x-0 bg-white border-t flex justify-center gap-2 p-2 md:static md:border-0 md:bg-transparent md:max-w-5xl md:mx-auto md:justify-center md:gap-3">
      {NAV[user.role].map(([to, icon, key]) => (<NavLink key={to} to={to} end className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}>{icon} {t(key)}</NavLink>))}</nav>}
    <footer className="text-center text-sm text-slate-500"><button className="underline" onClick={resetDemo}>{t('resetDemo')}</button></footer></div>);
}
