const encoder = new TextEncoder();
const SESSION_SECONDS = 60 * 60 * 8;

function bytesToHex(bytes) { return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex) { if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) throw new Error('Ungültiger Hash'); return new Uint8Array(hex.match(/.{2}/g).map(x => parseInt(x, 16))); }
async function sha256(value) { return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value))); }
export async function verifyPassword(password, stored) {
  // Format: pbkdf2$iterations$saltHex$hashHex
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;
  const salt = hexToBytes(parts[2]);
  const expected = hexToBytes(parts[3]);
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, expected.length * 8);
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
function cookieValue(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) { const [key, ...rest] = part.trim().split('='); if (key === name) return rest.join('='); }
  return '';
}
export async function createSession(request, env) {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = bytesToHex(tokenBytes);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('INSERT INTO sessions (token_hash, expires_at, created_at) VALUES (?, ?, ?)').bind(await sha256(token), now + SESSION_SECONDS, now).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', 'Set-Cookie': `sat_admin=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${SESSION_SECONDS}` } });
}
export async function requireAdmin(request, env) {
  const token = cookieValue(request, 'sat_admin');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const hash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(hash, now).first();
  return !!row;
}
export async function clearSession(request, env) {
  const token = cookieValue(request, 'sat_admin');
  if (token && /^[a-f0-9]{64}$/.test(token)) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'sat_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0' } });
}
export async function loginAllowed(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256(ip);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT attempts, window_started FROM login_attempts WHERE ip_hash = ?').bind(ipHash).first();
  if (row && now - row.window_started < 900 && row.attempts >= 5) return { allowed: false, ipHash, now };
  if (!row || now - row.window_started >= 900) await env.DB.prepare('INSERT OR REPLACE INTO login_attempts (ip_hash, attempts, window_started) VALUES (?, 0, ?)').bind(ipHash, now).run();
  return { allowed: true, ipHash, now };
}
export async function recordLoginFailure(env, state) {
  await env.DB.prepare('UPDATE login_attempts SET attempts = attempts + 1 WHERE ip_hash = ?').bind(state.ipHash).run();
}
export async function clearLoginFailures(env, state) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash = ?').bind(state.ipHash).run();
}
