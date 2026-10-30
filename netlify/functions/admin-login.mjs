import { checkPassword, sessionCookie, clearCookie, isAuthed, json } from './lib/auth.mjs';

export default async (req) => {
  // GET = session check, DELETE = logout, POST = login
  if (req.method === 'GET') return json({ authed: isAuthed(req) });

  if (req.method === 'DELETE') return json({ ok: true }, 200, { 'set-cookie': clearCookie() });

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body = {};
  try {
    body = await req.json();
  } catch {}

  if (checkPassword(body.password)) {
    return json({ ok: true }, 200, { 'set-cookie': sessionCookie() });
  }
  // small delay slows down password guessing
  await new Promise((r) => setTimeout(r, 800));
  return json({ error: 'invalid_password' }, 401);
};

export const config = { path: '/api/admin/session' };
