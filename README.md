# Guest check-in (Coronado Del Mar, Unit 15)

A premium, boutique-style pre-check-in experience for the property, in American English only. Single public link — the guest enters the check-in and check-out dates in the form, so there is no link per reservation. Data goes to Netlify DB (Postgres). The admin area is protected by one password.

## Pages

- `/` public pre-check-in — a 5-step wizard (reservation, primary guest, additional guests, details, house rules), mobile-first, max occupancy of 8 guests enforced client- and server-side
- `/admin` password-protected dashboard: Upcoming, Staying now, Past, All, search (server-side), CSV export

## Property photos

`public/images/*.webp` are real photos of the unit, sourced from the property's own Airbnb listing and optimized to WebP. Replace them (keeping the same filenames, or updating the `<img src>` paths in `public/index.html`) if the listing's photos change.

## Deploy

1. Put this folder in a Git repo (GitHub) and create a new Netlify site from it.
   Or use the CLI: `npm i -g netlify-cli && netlify init`.
2. Add the database: in the site dashboard open **Database** and enable Netlify DB,
   or run `netlify db init`. This creates `NETLIFY_DATABASE_URL` automatically.
   The `checkins` table is created on the first request, nothing to run by hand.
3. Add these environment variables (Site configuration, Environment variables):

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | the password for `/admin` |
| `SESSION_SECRET` | any random string of 32+ characters |
| `RESEND_API_KEY` | API key from resend.com |
| `FROM_EMAIL` | e.g. `Fabio <checkin@yourdomain.com>` (domain verified in Resend) |
| `NOTIFY_EMAIL` | where you want the "new check-in" notice, also used as reply-to |
| `WHATSAPP_NUMBER` | your number with country code, digits only, e.g. `13865550100` |

4. Deploy. Send the same link to every guest: `https://your-site.netlify.app/`

If `RESEND_API_KEY` or `FROM_EMAIL` is missing, the form still saves the data and just skips the emails.

## How it works

- `POST /api/submit` validates, saves, then sends the guest confirmation and your notice.
- The guest email shows the WhatsApp button only when the guest chose WhatsApp.
- `/api/admin/*` endpoints require the signed session cookie (12 hours, HttpOnly).
- Spam: hidden honeypot field plus server side validation.

## Local test

```
npm install
npm test          # validation tests
node test/auth-email.test.mjs
netlify dev       # runs site and functions with the linked database
```

## House rules

The house rules shown on the form were audited against the property's official Airbnb listing (check-in/out times, occupancy, smoking fee, pets, quiet hours, parking, pool access key, no commercial filming, accessibility). Two items could not be confirmed from the listing and were kept as-is from the previous version, pending confirmation with the condominium:
- Beach gear cleaning/storage instructions.
- Any seasonal sea-turtle lighting ordinance (common in New Smyrna Beach, but not stated on the listing for this specific unit).

## Notes

- No ID or passport numbers are collected. Add a field only if the condominium requires it.
- Max occupancy is 8 guests (per the listing), enforced in the step-3 UI and in `validate.mjs`.
- To delete old records: `DELETE FROM checkins WHERE check_out < now() - interval '12 months';`
