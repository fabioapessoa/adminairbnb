import { sql, ensureSchema } from './lib/db.mjs';
import { isAuthed, json } from './lib/auth.mjs';

export default async (req) => {
  if (!isAuthed(req)) return json({ error: 'unauthorized' }, 401);
  await ensureSchema();

  const url = new URL(req.url);
  const filter = url.searchParams.get('filter') || 'upcoming';
  const q = (url.searchParams.get('q') || '').trim();
  const like = q ? `%${q}%` : null;

  // search runs in SQL (ILIKE on name/email/phone) so it covers the full table,
  // not just the rows that happened to survive a filter's LIMIT
  let rows;
  if (filter === 'current') {
    rows = like
      ? await sql`SELECT * FROM checkins WHERE check_in <= CURRENT_DATE AND check_out >= CURRENT_DATE AND (resp_name ILIKE ${like} OR resp_email ILIKE ${like} OR resp_phone ILIKE ${like}) ORDER BY check_in`
      : await sql`SELECT * FROM checkins WHERE check_in <= CURRENT_DATE AND check_out >= CURRENT_DATE ORDER BY check_in`;
  } else if (filter === 'past') {
    rows = like
      ? await sql`SELECT * FROM checkins WHERE check_out < CURRENT_DATE AND (resp_name ILIKE ${like} OR resp_email ILIKE ${like} OR resp_phone ILIKE ${like}) ORDER BY check_in DESC LIMIT 200`
      : await sql`SELECT * FROM checkins WHERE check_out < CURRENT_DATE ORDER BY check_in DESC LIMIT 200`;
  } else if (filter === 'all') {
    rows = like
      ? await sql`SELECT * FROM checkins WHERE (resp_name ILIKE ${like} OR resp_email ILIKE ${like} OR resp_phone ILIKE ${like}) ORDER BY check_in DESC LIMIT 500`
      : await sql`SELECT * FROM checkins ORDER BY check_in DESC LIMIT 500`;
  } else {
    rows = like
      ? await sql`SELECT * FROM checkins WHERE check_in > CURRENT_DATE AND (resp_name ILIKE ${like} OR resp_email ILIKE ${like} OR resp_phone ILIKE ${like}) ORDER BY check_in`
      : await sql`SELECT * FROM checkins WHERE check_in > CURRENT_DATE ORDER BY check_in`;
  }

  return json({ rows });
};

export const config = { path: '/api/admin/list' };
