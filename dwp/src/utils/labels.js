// Translate stored English data values (skills, work types, places, statuses) into the selected language.
// Free text typed by users (names, custom skills) has no translation and is shown as entered.
import i18n from '../i18n';
const tr = (group, value) => {
  const v = String(value ?? '');
  const key = `${group}.${v}`;
  return v && i18n.exists(key) ? i18n.t(key) : v;
};
export const skillText = (v) => tr('sk', v);
export const placeText = (v) => tr('pl', v);
export const statusText = (v) => (i18n.exists(`st_${v}`) ? i18n.t(`st_${v}`) : v);
export const genderText = (v) => (i18n.exists(`g_${v}`) ? i18n.t(`g_${v}`) : v);
export const levelText = (v) => (i18n.exists(`lvl_${v}`) ? i18n.t(`lvl_${v}`) : v);
export const skillList = (list = []) => list.map(skillText).join(', ');
const PATH = { 'Job Requirement': 'lblJob', Experience: 'lblExperience', Location: 'lblLocation', Worker: 'lblWorker' };
export const pathText = (v) => (PATH[v] ? i18n.t(PATH[v]) : skillText(v));
export const LOCALES = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN' };
export const nameText = (v) => tr('nm', v);
export const commentText = (v) => tr('cm', v);
