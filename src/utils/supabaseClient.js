import { createClient } from '@supabase/supabase-js';

// Single shared Supabase client per auth domain (landlord vs. tenant),
// imported everywhere instead of each page/component file calling
// createClient() for itself. Before this, ~20 files each created their own
// client with the SAME storageKey -- harmless most of the time (Supabase
// warns "Multiple GoTrueClient instances... may produce undefined
// behavior" but doesn't error), except at the one moment that actually
// matters: landing on a page with an email-confirmation or
// password-reset link's access/refresh tokens in the URL hash. Every one
// of those separately-created clients tries to parse and exchange that
// hash at once; only one can actually win, the rest fail with a 400, and
// which client's in-memory state ends up stale is effectively random.
// That's what was silently sending confirmed signups to the dashboard
// instead of the mandatory /subscribe gate -- not a bug in the gate logic
// itself, but a race in which Supabase client happened to "see" the new
// session by the time the gate checked it.
export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-landlord-auth' } }
);

export const supabaseTenant = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'pd-tenant-auth' } }
);
