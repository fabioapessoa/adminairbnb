import { sql, ensureSchema } from './lib/db.mjs';
import { validate } from './lib/validate.mjs';
import { sendGuestConfirmation, sendHostNotice } from './lib/email.mjs';
import { json } from './lib/auth.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // honeypot: bots fill hidden fields, humans do not
  if (body.website) return json({ ok: true });

  const { ok, errors, data: d } = validate(body);
  if (!ok) return json({ error: 'validation', fields: errors }, 400);

  try {
    await ensureSchema();
    const rows = await sql`
      INSERT INTO checkins (
        check_in, check_out, platform, resp_name, resp_email, resp_phone, resp_birth,
        resp_address, contact_pref, language, arrival_time, vehicles, pets, guests,
        notes, accepted_rules
      ) VALUES (
        ${d.check_in}, ${d.check_out}, ${d.platform || null}, ${d.resp_name}, ${d.resp_email},
        ${d.resp_phone}, ${d.resp_birth || null}, ${d.resp_address || null}, ${d.contact_pref},
        ${d.language}, ${d.arrival_time || null}, ${d.vehicles || null}, ${d.pets || null},
        ${JSON.stringify(d.guests)}::jsonb, ${d.notes || null}, ${d.accepted_rules}
      ) RETURNING id
    `;
    const id = rows[0].id;

    // emails must never break the submission
    await Promise.allSettled([sendGuestConfirmation(d), sendHostNotice(d, id)]);

    return json({ ok: true, id });
  } catch (err) {
    console.error('submit failed', err);
    return json({ error: 'server_error' }, 500);
  }
};

export const config = { path: '/api/submit' };
