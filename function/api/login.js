import { verifyPassword, createSession, loginAllowed, recordLoginFailure, clearLoginFailures } from '../_lib/auth.js';
export async function onRequestPost({ request, env }) {
  const state = await loginAllowed(request, env);
  if (!state.allowed) return Response.json({ error: 'Zu viele Versuche. Bitte warte 15 Minuten.' }, { status: 429 });
  let body; try { body = await request.json(); } catch { return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 }); }
  const username = String(body.username || '');
  const password = String(body.password || '');
  const validUser = username === env.ADMIN_USERNAME;
  const validPassword = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!validUser || !validPassword) {
    await recordLoginFailure(env, state);
    return Response.json({ error: 'Benutzername oder Passwort ist falsch.' }, { status: 401 });
  }
  await clearLoginFailures(env, state);
  return createSession(request, env);
}
