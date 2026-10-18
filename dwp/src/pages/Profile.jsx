import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser, profileOf, saveProfile, useDb } from '../services/store';
import { VoiceInput } from '../components/Voice';
import { parseSkills } from '../utils/skills';
import { skillList } from '../utils/labels';
export default function Profile() {
  const { t } = useTranslation(); const db = useDb(); const user = getUser(db); const nav = useNavigate();
  const p = profileOf(user, db) || {}; const isW = user.role === 'worker';
  const [f, setF] = useState({ location: p.location || '', state: p.state || '', workType: p.workType || '', skills: (p.skills || p.requiredSkills || []).join(', '), experience: p.experience ?? '', expectedSalary: p.expectedSalary ?? '', availability: p.availability || 'Available', age: p.age ?? '', gender: p.gender || '' });
  const [err, setErr] = useState(''); const set = (k) => (v) => setF({ ...f, [k]: v });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.location || !f.state || !f.workType || !parseSkills(f.skills).length || (isW && (f.experience === '' || !f.expectedSalary || !f.age || !f.gender))) return setErr(t('weak').split('.')[0] + '.');
    const skills = parseSkills(f.skills);
    const r = await saveProfile(user, isW ? { ...f, skills, experience: +f.experience, expectedSalary: +f.expectedSalary, age: +f.age } : { location: f.location, state: f.state, workType: f.workType, requiredSkills: skills });
    if (r.error) return setErr(t(r.error));
    nav(isW ? '/worker' : '/client');
  };
  return (<form onSubmit={submit} className="card max-w-xl mx-auto space-y-4"><h2 className="text-2xl font-bold">{t('completeProfile')}</h2>
    <VoiceInput label={t('location')} value={f.location} onChange={set('location')} /><VoiceInput label={t('state')} value={f.state} onChange={set('state')} />
    <VoiceInput label={t('workType')} value={f.workType} onChange={set('workType')} /><VoiceInput label={t('skills')} value={f.skills} onChange={set('skills')} />
    {parseSkills(f.skills).length > 0 && <p className="text-base text-leaf font-semibold">✅ {t('detectedSkills')}: {skillList(parseSkills(f.skills))}</p>}
    {isW && <><label className="block">{t('experience')}<input type="number" min="0" className="input" value={f.experience} onChange={(e) => set('experience')(e.target.value)} /></label>
      <label className="block">{t('salary')}<input type="number" min="0" className="input" value={f.expectedSalary} onChange={(e) => set('expectedSalary')(e.target.value)} /></label>
      <label className="block">{t('age')}<input type="number" min="14" className="input" value={f.age} onChange={(e) => set('age')(e.target.value)} /></label>
      <label className="block">{t('gender')}<select className="input" value={f.gender} onChange={(e) => set('gender')(e.target.value)}><option value="">—</option><option value="Female">{t('female')}</option><option value="Male">{t('male')}</option><option value="Other">{t('other')}</option><option value="Prefer not to say">{t('noSay')}</option></select></label>
      <label className="block">{t('availability')}<select className="input" value={f.availability} onChange={(e) => set('availability')(e.target.value)}><option value="Available">{t('st_Available')}</option><option value="Busy">{t('st_Busy')}</option></select></label></>}
    {err && <p role="alert" className="text-red-700 font-semibold">⚠️ {err}</p>}<button className="btn btn-primary w-full">{t('save')}</button></form>);
}
