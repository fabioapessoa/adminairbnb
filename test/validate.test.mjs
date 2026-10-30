import assert from 'node:assert/strict';
import { validate } from '../netlify/functions/lib/validate.mjs';

const good = {
  check_in: '2026-12-26', check_out: '2027-01-02', resp_name: 'Jorge Test',
  resp_email: 'Jorge@Example.com', resp_phone: '+1 407 555 0100',
  accepted_rules: true, contact_pref: 'whatsapp', language: 'pt',
  guests: [{ name: 'Ana', birth: '1990-05-01' }, { name: '' }, { name: 'Leo', birth: 'bad' }],
};

let r = validate(good);
assert.equal(r.ok, true);
assert.equal(r.data.resp_email, 'jorge@example.com');
assert.equal(r.data.guests.length, 2);
assert.equal(r.data.guests[1].birth, '');
assert.equal(r.data.contact_pref, 'whatsapp');

r = validate({ ...good, check_out: '2026-12-20' });
assert.ok(r.errors.includes('check_out_before_check_in'));

r = validate({ ...good, resp_email: 'nope' });
assert.ok(r.errors.includes('resp_email'));

r = validate({ ...good, accepted_rules: false });
assert.ok(r.errors.includes('accepted_rules'));

r = validate({ ...good, contact_pref: 'sms', language: 'fr' });
assert.equal(r.data.contact_pref, 'email');
assert.equal(r.data.language, 'en');

// max occupancy: 8 total guests, including the primary guest
const sevenExtra = Array.from({ length: 7 }, (_, i) => ({ name: `Guest ${i}` }));
r = validate({ ...good, guests: sevenExtra });
assert.equal(r.ok, true, 'exactly 8 total guests is allowed');
assert.equal(r.data.guests.length, 7);

const eightExtra = Array.from({ length: 8 }, (_, i) => ({ name: `Guest ${i}` }));
r = validate({ ...good, guests: eightExtra });
assert.ok(r.errors.includes('occupancy'), '9 total guests exceeds the 8-guest maximum');

console.log('validate: all tests passed');
