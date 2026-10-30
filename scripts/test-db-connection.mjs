// quick smoke test: load .env.local manually since we don't depend on the dotenv package
import fs from 'node:fs';
const envLocal = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envLocal.split('\n')) {
  const m = line.match(/^([A-Z_]+)="(.*)"$/);
  if (m) process.env[m[1]] = m[2];
}

const { sql, ensureSchema } = await import('../netlify/functions/lib/db.mjs');
const { validate } = await import('../netlify/functions/lib/validate.mjs');

console.log('1. Connecting and ensuring schema...');
await ensureSchema();
console.log('   OK — checkins table ready.');

console.log('2. Validating + inserting a test row (same path as /api/submit)...');
const { ok, errors, data: d } = validate({
  check_in: '2026-12-20',
  check_out: '2026-12-27',
  platform: 'Airbnb',
  resp_name: 'DB Connection Test',
  resp_email: 'db-test@example.com',
  resp_phone: '+1 407 555 0100',
  contact_pref: 'email',
  language: 'en',
  accepted_rules: true,
  guests: [{ name: 'Test Guest 2' }],
});
if (!ok) throw new Error('validation failed: ' + errors.join(', '));

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
console.log('   OK — inserted row id', id);

console.log('3. Reading it back...');
const [readBack] = await sql`SELECT id, resp_name, resp_email, guests FROM checkins WHERE id = ${id}`;
console.log('   OK —', JSON.stringify(readBack));

console.log('4. Cleaning up the test row...');
await sql`DELETE FROM checkins WHERE id = ${id}`;
const [{ count }] = await sql`SELECT count(*)::int FROM checkins WHERE id = ${id}`;
console.log('   OK — rows remaining with that id:', count);

console.log('\nAll good: schema, insert, read and delete all worked end to end.');
process.exit(0);
