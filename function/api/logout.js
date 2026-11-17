import { clearSession } from '../_lib/auth.js';
export async function onRequestPost({ request, env }) { return clearSession(request, env); }
