import { neon } from '@netlify/neon';

// Netlify DB injects NETLIFY_DATABASE_URL automatically
export const sql = neon();

let ready;
export function ensureSchema() {
  if (!ready) {
    ready = sql`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        platform TEXT,
        resp_name TEXT NOT NULL,
        resp_email TEXT NOT NULL,
        resp_phone TEXT NOT NULL,
        resp_birth DATE,
        resp_address TEXT,
        contact_pref TEXT NOT NULL DEFAULT 'email',
        language TEXT NOT NULL DEFAULT 'en',
        arrival_time TEXT,
        vehicles TEXT,
        pets TEXT,
        guests JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT,
        accepted_rules BOOLEAN NOT NULL,
        accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.then(() => sql`CREATE INDEX IF NOT EXISTS checkins_dates_idx ON checkins (check_in, check_out)`);
  }
  return ready;
}
