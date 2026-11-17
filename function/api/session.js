import { requireAdmin } from '../_lib/auth.js';
export async function onRequestGet({ request, env }) {
  if (!await requireAdmin(request, env)) return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  return Response.json({ ok: true });
}
