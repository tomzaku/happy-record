// Who's calling. Every resource route needs a signed-in user — the app has
// no route open to strangers yet — so only `requireUser` is exported.
//
// The returned client carries the caller's own JWT, so every query it makes
// runs RLS-scoped: a user can only ever reach their own rows. That's the only
// place identity is allowed to come from — never a `user_id` in the request
// body (see CLAUDE.md, "identity comes from the session").

import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

/** Verify the caller is signed in (anonymous sessions count). Null if not. */
export async function requireUser(req: Request): Promise<{ supabase: SupabaseClient; user: User } | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user };
}
