import assert from 'node:assert/strict';
process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.ADMIN_PASSWORD = 'senha-teste';
process.env.FROM_EMAIL = 'Fabio <hi@example.com>';
process.env.RESEND_API_KEY = 'k';
const { checkPassword, sessionCookie, isAuthed, clearCookie } = await import('../netlify/functions/lib/auth.mjs');

assert.equal(checkPassword('senha-teste'), true);
assert.equal(checkPassword('errada'), false);
assert.equal(checkPassword(''), false);

const cookie = sessionCookie().split(';')[0];
const req = (c) => ({ headers: new Headers(c ? { cookie: c } : {}) });
assert.equal(isAuthed(req(cookie)), true);
assert.equal(isAuthed(req()), false);
assert.equal(isAuthed(req(cookie.slice(0, -3) + 'abc')), false);
assert.equal(isAuthed(req('admin_session=1.2')), false);
assert.ok(clearCookie().includes('Max-Age=0'));

// email: capture the payload sent to Resend
let sent;
globalThis.fetch = async (url, opts) => { sent = JSON.parse(opts.body); return { ok: true, status: 200, text: async () => '' }; };
const { sendGuestConfirmation } = await import('../netlify/functions/lib/email.mjs');
const base = { check_in: '2026-12-26', check_out: '2027-01-02', resp_name: '<b>Ana</b>', resp_email: 'a@b.com', language: 'en', guests: [{}, {}] };

await sendGuestConfirmation({ ...base, contact_pref: 'whatsapp' });
assert.ok(!sent.html.includes('wa.me'), 'no whatsapp button in the guest email (WhatsApp is host-initiated, from the admin panel)');
assert.ok(sent.html.includes('airbnb.com/rooms/'), 'links back to the Airbnb listing');
assert.ok(!sent.html.includes('<b>Ana</b>'), 'name is escaped');
assert.ok(sent.html.includes('>3<'), 'total guests = others + 1');

await sendGuestConfirmation({ ...base, contact_pref: 'email' });
assert.ok(!sent.html.includes('wa.me'), 'still no whatsapp button for email preference');
console.log('auth + email: all tests passed');
