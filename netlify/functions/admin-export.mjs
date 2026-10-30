import { sql, ensureSchema } from './lib/db.mjs';
import { isAuthed, json } from './lib/auth.mjs';

const cell = (v) => {
  let s = v == null ? '' : String(v);
  // neutralize spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

const day = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v);

export default async (req) => {
  if (!isAuthed(req)) return json({ error: 'unauthorized' }, 401);
  await ensureSchema();

  const url = new URL(req.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const rows =
    from && to
      ? await sql`SELECT * FROM checkins WHERE check_in <= ${to} AND check_out >= ${from} ORDER BY check_in`
      : await sql`SELECT * FROM checkins ORDER BY check_in DESC`;

  const header = ['id', 'check_in', 'check_out', 'platform', 'name', 'email', 'phone', 'birth', 'address', 'guests', 'pets', 'vehicles', 'arrival', 'contact', 'submitted_at'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const guests = (r.guests || []).map((g) => `${g.name}${g.birth ? ' (' + g.birth + ')' : ''}`).join('; ');
    lines.push(
      [r.id, day(r.check_in), day(r.check_out), r.platform, r.resp_name, r.resp_email, r.resp_phone, day(r.resp_birth), r.resp_address, guests, r.pets, r.vehicles, r.arrival_time, r.contact_pref, r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at]
        .map(cell)
        .join(',')
    );
  }

  return new Response('﻿' + lines.join('\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="checkins.csv"',
      'cache-control': 'no-store',
    },
  });
};

export const config = { path: '/api/admin/export' };
