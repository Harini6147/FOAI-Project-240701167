import i18n from '../i18n';
// Data layer: talks to the FastAPI backend (backend/main.py). Pages keep using the same functions as before.
import { useSyncExternalStore } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN = 'dwp_token'; // kept per browser tab, so a client tab and a worker tab can both stay signed in
const EMPTY = { me: null, workers: [], clients: [], connections: [], txns: [] };
let state = { ...EMPTY, loading: !!sessionStorage.getItem(TOKEN), error: false };
let lastJson = '';
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const useDb = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);

async function api(path, { method = 'GET', body } = {}) {
  const token = sessionStorage.getItem(TOKEN);
  const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error('api'), { status: res.status, detail: data.detail });
  return data;
}
const errorKey = (e) => (!e.status ? 'network' : e.status === 409 && e.detail === 'exists' ? 'exists' : e.status === 401 ? e.detail || 'invalid' : 'weak');

export async function refresh() {
  if (!sessionStorage.getItem(TOKEN)) { lastJson = ''; return set({ ...EMPTY, loading: false, error: false }); }
  try {
    const [{ user }, data] = await Promise.all([api('/api/me'), api('/api/data')]);
    const json = JSON.stringify([user, data]);
    if (json !== lastJson || state.loading || state.error) { lastJson = json; set({ me: user, ...data, loading: false, error: false }); }
  } catch (e) {
    if (e.status === 401) { sessionStorage.removeItem(TOKEN); set({ ...EMPTY, loading: false, error: false }); }
    else set({ loading: false, error: true });
  }
}
if (sessionStorage.getItem(TOKEN)) refresh();
setInterval(() => { if (sessionStorage.getItem(TOKEN) && !document.hidden) refresh(); }, 4000); // picks up payments/connections made in another tab

// ---- auth ----
async function startSession(path, body) {
  try { const { token } = await api(path, { method: 'POST', body }); sessionStorage.setItem(TOKEN, token); await refresh(); return {}; }
  catch (e) { return { error: errorKey(e) }; }
}
export const signUp = ({ name, login, password, role }) => startSession('/api/auth/signup', { name: name.trim(), login, password, role });
export const signIn = (login, password) => startSession('/api/auth/signin', { login, password });
export async function signOut() { try { await api('/api/auth/signout', { method: 'POST' }); } catch { /* ignore */ } sessionStorage.removeItem(TOKEN); await refresh(); }
export const getUser = (d = state) => d.me;
export const profileOf = (user, d = state) => user && (user.role === 'worker' ? d.workers : d.clients).find((x) => x.id === user.profileId);
export const maskPhone = (p = '') => '+91 ******' + p.slice(-4);
export async function resetDemo() { try { await api('/api/reset-demo', { method: 'POST' }); } catch { /* ignore */ } sessionStorage.removeItem(TOKEN); location.reload(); }

// ---- actions ----
const tidy = (v) => String(v).trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export async function saveProfile(user, data) {
  data = { ...data };
  ['location', 'state', 'workType'].forEach((k) => { if (data[k]) data[k] = tidy(data[k]); });
  ['skills', 'requiredSkills'].forEach((k) => { if (data[k]) data[k] = data[k].map(tidy); });
  try { await api('/api/profile', { method: 'PUT', body: data }); await refresh(); return {}; } catch (e) { return { error: errorKey(e) }; }
}
export async function connect(clientId, worker, job, salary, match) {
  try { await api('/api/connections', { method: 'POST', body: { workerId: worker.id, job, salary, match } }); await refresh(); return true; } catch { return false; }
}
export async function addTxn(conn, amount, type) {
  if (!(+amount > 0)) return false;
  try { await api('/api/transactions', { method: 'POST', body: { connectionId: conn.id, amount: Math.round(+amount), type } }); await refresh(); return true; } catch { return false; }
}
export async function addRating(connId, stars, comment) {
  try { await api('/api/ratings', { method: 'POST', body: { connectionId: connId, stars, comment } }); await refresh(); return true; } catch { return false; }
}


export async function getMessages(connectionId) {
  try { return (await api(`/api/connections/${encodeURIComponent(connectionId)}/messages`)).messages || []; }
  catch { return null; }
}
export async function sendMessage(connectionId, body) {
  try { const result = await api(`/api/connections/${encodeURIComponent(connectionId)}/messages`, { method: 'POST', body: { body } }); return result.message || null; }
  catch { return null; }
}

// ---- derived numbers ----
export function stats(workerId, d = state) {
  const txns = d.txns.filter((t) => t.workerId === workerId);
  const conns = d.connections.filter((c) => c.workerId === workerId);
  const ratings = conns.flatMap((c) => c.ratings);
  const byMonth = {};
  txns.forEach((t) => { const m = t.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + t.amount; });
  const total = txns.reduce((s, t) => s + t.amount, 0), months = Object.keys(byMonth).length;
  return { txns, conns, byMonth, total, payments: txns.length, avgMonthly: months ? Math.round(total / months) : 0, avgRating: ratings.length ? ratings.reduce((s, r) => s + r.stars, 0) / ratings.length : 0, ratingCount: ratings.length, active: conns.filter((c) => c.status === 'Active').length };
}
// The trust indicator is calculated by the backend (see trust_for in backend/main.py) and arrives with each worker.
export const trustScore = (w) => w.trust || { score: 0, parts: [] };
export const trustOf = (w) => trustScore(w).score;

export async function translateMessage(connectionId, text, source, target) {
  try {
    const result = await api(`/api/connections/${encodeURIComponent(connectionId)}/translate`, {
      method: 'POST', body: { text, source, target },
    });
    return { text: result.translatedText || null };
  } catch (e) {
    return { text: null, error: e?.status ? i18n.t(e.status === 503 ? 'trUnavailable' : 'trFailed') : i18n.t('trNoBackend') };
  }
}

// Browser-independent voice fallback: upload a short recording to the local FastAPI Whisper endpoint.
export async function transcribeVoice(blob, language = 'en') {
  try {
    const token = sessionStorage.getItem(TOKEN);
    const form = new FormData();
    form.append('audio', blob, 'voice.webm');
    form.append('language', language);
    const res = await fetch(API + '/api/voice/transcribe', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || 'transcription_unavailable');
    return data.text || '';
  } catch (error) {
    throw error;
  }
}
