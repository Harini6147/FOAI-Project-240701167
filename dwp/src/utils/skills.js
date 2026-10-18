// Smart skill detection: "cook", "cooking", "cooker", "chef", "Cooks" and even small typos all map to ONE skill ("Cooking").
const norm = (w = '') => String(w).toLowerCase().replace(/[^\p{L}\p{M}]/gu, '');
// Reduce a word to its root: cooking/cooker/cooks -> cook, driving/driver/drive -> driv
const SUFFIXES = ['ing', 'ers', 'er', 'ors', 'or', 'ists', 'ist', 'ians', 'ian', 'ed', 'es', 's', 'y', 'e'];
export function stem(word) {
  let w = norm(word);
  for (const suf of SUFFIXES) if (w.endsWith(suf) && w.length - suf.length >= 3) { w = w.slice(0, -suf.length); break; }
  return w;
}
// Each skill lists the words people may use for it (English, common Indian terms, a few Hindi/Tamil words). Add more freely.
const RAW = {
  'Cooking': ['cook', 'cooking', 'chef', 'kitchen', 'culinary', 'cater', 'baking', 'tiffin', 'biryani', 'खाना', 'रसोई', 'कुक', 'சமையல்'],
  'Cleaning': ['clean', 'sweep', 'mop', 'housekeeping', 'maid', 'dusting', 'sanitation', 'janitor', 'सफाई', 'சுத்தம்'],
  'Childcare': ['childcare', 'babysit', 'nanny', 'ayah', 'aaya', 'childminder', 'kidcare'],
  'Elder & Patient Care': ['eldercare', 'elder', 'caregiver', 'caretaker', 'nurse', 'patient', 'attendant'],
  'Driving': ['drive', 'driver', 'chauffeur', 'cab', 'taxi', 'ड्राइवर', 'ஓட்டுநர்'],
  'Electrical Work': ['electric', 'electrician', 'wiring', 'wireman', 'lineman'],
  'Plumbing': ['plumb', 'pipe', 'pipefitter'],
  'Repairs': ['repair', 'fix', 'maintenance', 'mechanic', 'technician'],
  'Tailoring': ['tailor', 'stitch', 'sew', 'seamstress', 'embroidery'],
  'Gardening': ['garden', 'mali', 'lawn', 'plantcare'],
  'Security': ['security', 'guard', 'watchman', 'gatekeeper'],
  'Construction': ['mason', 'construction', 'build', 'carpenter', 'welder', 'bricklayer'],
  'Painting': ['paint', 'whitewash'],
  'Laundry': ['laundry', 'wash', 'iron', 'dhobi', 'ironing'],
  'Delivery': ['deliver', 'courier', 'delivery'],
};
const GROUPS = Object.entries(RAW).map(([label, words]) => ({ label, stems: words.map(stem) }));
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const close = (a, b) => { const m = Math.min(a.length, b.length); return m >= 4 && a[0] === b[0] && lev(a, b) <= (m >= 8 ? 2 : 1); }; // typo tolerance
// Which known skill does this word belong to? (null if unknown)
export function conceptOf(term) {
  const s = stem(term);
  if (!s) return null;
  for (const g of GROUPS) if (g.stems.some((x) => s === x || (x.length >= 4 && s.startsWith(x)))) return g.label;
  for (const g of GROUPS) if (g.stems.some((x) => close(s, x))) return g.label;
  return null;
}
const tidy = (v) => String(v).trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export const skillLabel = (term) => conceptOf(term) || tidy(term);
export function sameSkill(a, b) {
  const ca = conceptOf(a), cb = conceptOf(b);
  if (ca || cb) return ca === cb;
  const sa = stem(a), sb = stem(b);
  return sa === sb || (Math.min(sa.length, sb.length) >= 5 && lev(sa, sb) <= 1);
}
const FILLER = new Set('i am a an the can do does work works working as also know knows with my skills skill good at in of have has experience job doing to for is be able want wish provide service services'.split(' '));
// "I can cook and clean, driving" -> ["Cooking", "Cleaning", "Driving"]
export function parseSkills(text = '') {
  const out = [];
  for (const chunk of String(text).split(/[,;/&\n]|\band\b|\bor\b/i)) {
    const words = chunk.trim().split(/\s+/).filter((w) => w && !FILLER.has(w.toLowerCase()));
    if (!words.length) continue;
    const whole = conceptOf(words.join(''));
    if (words.length === 1 || whole) out.push(skillLabel(words.length === 1 ? words[0] : words.join('')));
    else { const found = words.map(conceptOf).filter(Boolean); out.push(...(found.length ? found : [tidy(words.join(' '))])); }
  }
  return [...new Set(out)];
}
