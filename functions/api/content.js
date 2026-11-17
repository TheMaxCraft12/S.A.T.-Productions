import { requireAdmin } from '../_lib/auth.js';
const allowed = new Set(['projects', 'trailers']);
export async function onRequestGet({ request, env }) {
  // Projekt- und Trailerinformationen sind öffentliche Website-Inhalte.
  const { results } = await env.DB.prepare('SELECT id, type, data FROM content ORDER BY updated_at DESC').all();
  const output = { projects: [], trailers: [] };
  for (const row of results || []) { try { output[row.type].push({ id: row.id, ...JSON.parse(row.data) }); } catch {} }
  return Response.json(output);
}
export async function onRequestPost({ request, env }) {
  if (!await requireAdmin(request, env)) return Response.json({ error: 'Bitte zuerst anmelden.' }, { status: 401 });
  let body; try { body = await request.json(); } catch { return Response.json({ error: 'Ungültige Anfrage.' }, { status: 400 }); }
  const type = String(body.type || '');
  if (!allowed.has(type)) return Response.json({ error: 'Ungültiger Inhaltstyp.' }, { status: 400 });
  const now = Math.floor(Date.now() / 1000);
  if (body.action === 'delete') {
    if (!body.id) return Response.json({ error: 'Eintrag-ID fehlt.' }, { status: 400 });
    await env.DB.prepare('DELETE FROM content WHERE id = ? AND type = ?').bind(String(body.id), type).run();
    return Response.json({ ok: true });
  }
  const data = body.data || {};
  const title = String(data.title || '').trim();
  if (!title || title.length > 70) return Response.json({ error: 'Bitte einen Titel mit maximal 70 Zeichen angeben.' }, { status: 400 });
  const fields = type === 'projects' ? ['title','category','description','status','image','link'] : ['title','category','url','description'];
  const clean = {};
  for (const key of fields) clean[key] = String(data[key] || '').trim().slice(0, key === 'description' ? 400 : 500);
  if (type === 'trailers' && !/^https:\/\//i.test(clean.url)) return Response.json({ error: 'Bitte eine öffentliche HTTPS-Video-URL verwenden.' }, { status: 400 });
  for (const key of ['image','link']) if (clean[key] && !/^https:\/\//i.test(clean[key])) return Response.json({ error: 'Bild- und Projekt-Links müssen HTTPS verwenden.' }, { status: 400 });
  if (body.action === 'update' && body.id) {
    await env.DB.prepare('UPDATE content SET data = ?, updated_at = ? WHERE id = ? AND type = ?').bind(JSON.stringify(clean), now, String(body.id), type).run();
    return Response.json({ ok: true, id: body.id });
  }
  const id = crypto.randomUUID();
  await env.DB.prepare('INSERT INTO content (id, type, data, updated_at) VALUES (?, ?, ?, ?)').bind(id, type, JSON.stringify(clean), now).run();
  return Response.json({ ok: true, id });
}
