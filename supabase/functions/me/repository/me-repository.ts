// Plain data access for `me` (the `pro_users` table) — no business logic, no authorization
// decisions, just a query. `services/me-service.ts` is the only thing that calls this; `api/`
// never reaches in here directly (see CLAUDE.md's "Authorization: app layer, not RLS"). Read-only
// on purpose: a row is granted by hand (SQL editor) or by the signup trial trigger, never by a
// client request — there's no upsert/remove here.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type ProUserRow = { expires_at: string | null; note: string | null };

export async function fetchProUser(db: SupabaseClient, userId: string): Promise<ProUserRow | null> {
  const { data, error } = await db
    .from('pro_users')
    .select('expires_at, note')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProUserRow | null) ?? null;
}
