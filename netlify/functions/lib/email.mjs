const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const BRAND = { navy: '#142B3B', teal: '#176B75', ivory: '#FAF8F4', sand: '#E9DFD0', gold: '#B69A72', gray: '#707A80' };
const AIRBNB_URL = 'https://www.airbnb.com/rooms/1090074875362236448';

const T = {
  subject: 'Pre-Check-In Confirmed | Coronado Del Mar',
  hello: (n) => `Hi ${n},`,
  thanks: 'Your pre-check-in information has been successfully received. We look forward to welcoming you to Coronado Del Mar, Unit 15.',
  summary: 'Your stay',
  stay: 'Dates',
  property: 'Property',
  guests: 'Guests',
  reminder: 'Check-in is after 4:00 PM and check-out is before 10:00 AM. The unit uses a self check-in smart lock, and your access details will be sent through the booking platform. If you need an earlier arrival, just let us know and we will do our best to accommodate you.',
  wa: 'Message us on WhatsApp',
  waText: (n, d) => `Hi, this is ${n}. I just completed the pre-check-in form for ${d}.`,
  sign: 'Warmly,\nFabio',
  to: 'to',
};

async function send({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!key || !from) {
    console.warn('Email skipped: RESEND_API_KEY or FROM_EMAIL not set');
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
  return { ok: res.ok };
}

export async function sendGuestConfirmation(d) {
  const t = T;
  const dates = `${d.check_in} ${t.to} ${d.check_out}`;
  const wa = (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(t.waText(d.resp_name, dates))}` : '';
  const showWa = d.contact_pref === 'whatsapp' && waLink;
  const totalGuests = d.guests.length + 1;

  const html = `
  <div style="background:${BRAND.ivory};padding:32px 16px;font-family:Georgia,'Times New Roman',serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${BRAND.sand};border-radius:14px;overflow:hidden">
      <div style="background:${BRAND.navy};padding:26px 32px;text-align:center">
        <p style="margin:0;color:${BRAND.sand};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif">Coronado Del Mar</p>
        <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:700">Pre-Check-In Confirmed</p>
      </div>
      <div style="padding:30px 32px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.navy};line-height:1.6;font-size:15px">
        <p>${esc(t.hello(d.resp_name))}</p>
        <p>${esc(t.thanks)}</p>
        <table style="width:100%;border-collapse:collapse;margin:22px 0;font-size:14px">
          <tr>
            <td style="padding:8px 0;color:${BRAND.gray};border-top:1px solid ${BRAND.sand}">${esc(t.property)}</td>
            <td style="padding:8px 0;text-align:right;border-top:1px solid ${BRAND.sand};font-weight:600">Unit 15, New Smyrna Beach, FL</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:${BRAND.gray};border-top:1px solid ${BRAND.sand}">${esc(t.stay)}</td>
            <td style="padding:8px 0;text-align:right;border-top:1px solid ${BRAND.sand};font-weight:600">${esc(dates)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:${BRAND.gray};border-top:1px solid ${BRAND.sand}">${esc(t.guests)}</td>
            <td style="padding:8px 0;text-align:right;border-top:1px solid ${BRAND.sand};font-weight:600">${totalGuests}</td>
          </tr>
        </table>
        <p style="color:${BRAND.gray};font-size:13.5px">${esc(t.reminder)}</p>
        <p style="font-size:13.5px"><a href="${AIRBNB_URL}" style="color:${BRAND.teal};font-weight:600;text-decoration:none">View your listing on Airbnb &rarr;</a></p>
        ${showWa ? `<p style="margin:26px 0;text-align:center"><a href="${esc(waLink)}" style="background:${BRAND.gold};color:${BRAND.navy};text-decoration:none;padding:13px 26px;border-radius:8px;display:inline-block;font-weight:bold;font-size:14px">${esc(t.wa)}</a></p>` : ''}
        <p style="margin-top:28px;white-space:pre-line">${esc(t.sign)}</p>
      </div>
    </div>
  </div>`;

  return send({ to: d.resp_email, subject: t.subject, html, replyTo: process.env.NOTIFY_EMAIL });
}

export async function sendHostNotice(d, id) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return { skipped: true };
  const rows = [
    ['Dates', `${d.check_in} to ${d.check_out}`],
    ['Name', d.resp_name],
    ['Email', d.resp_email],
    ['Phone', d.resp_phone],
    ['Platform', d.platform || '-'],
    ['Guests (total)', d.guests.length + 1],
    ['Pets', d.pets || '-'],
    ['Vehicles', d.vehicles || '-'],
    ['Arrival', d.arrival_time || '-'],
    ['Contact', d.contact_pref],
  ]
    .map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#6b7280">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px"><p><b>New check-in form #${id}</b></p><table>${rows}</table></div>`;
  return send({ to, subject: `New check-in: ${d.resp_name} (${d.check_in})`, html });
}
