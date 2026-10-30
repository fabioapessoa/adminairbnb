const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);

export function validate(body) {
  const errors = [];
  const d = {
    check_in: clean(body.check_in, 10),
    check_out: clean(body.check_out, 10),
    platform: clean(body.platform, 30),
    resp_name: clean(body.resp_name, 120),
    resp_email: clean(body.resp_email, 160).toLowerCase(),
    resp_phone: clean(body.resp_phone, 40),
    resp_birth: clean(body.resp_birth, 10),
    resp_address: clean(body.resp_address, 300),
    contact_pref: body.contact_pref === 'whatsapp' ? 'whatsapp' : 'email',
    language: body.language === 'pt' ? 'pt' : 'en',
    arrival_time: clean(body.arrival_time, 40),
    vehicles: clean(body.vehicles, 200),
    pets: clean(body.pets, 200),
    notes: clean(body.notes, 800),
    accepted_rules: body.accepted_rules === true,
    guests: [],
  };

  if (!isDate(d.check_in)) errors.push('check_in');
  if (!isDate(d.check_out)) errors.push('check_out');
  if (isDate(d.check_in) && isDate(d.check_out) && d.check_out <= d.check_in) errors.push('check_out_before_check_in');
  if (!d.resp_name) errors.push('resp_name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.resp_email)) errors.push('resp_email');
  if (d.resp_phone.replace(/\D/g, '').length < 7) errors.push('resp_phone');
  if (d.resp_birth && !isDate(d.resp_birth)) errors.push('resp_birth');
  if (!d.accepted_rules) errors.push('accepted_rules');

  const list = Array.isArray(body.guests) ? body.guests.slice(0, 20) : [];
  for (const g of list) {
    const name = clean(g?.name, 120);
    if (!name) continue; // ignore empty rows
    const birth = clean(g?.birth, 10);
    d.guests.push({
      name,
      birth: isDate(birth) ? birth : '',
      relation: clean(g?.relation, 60),
    });
  }

  // max occupancy per the listing: 8 guests total, including the primary guest
  if (d.guests.length + 1 > 8) errors.push('occupancy');

  return { ok: errors.length === 0, errors, data: d };
}
