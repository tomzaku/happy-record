// Read for the `pro_users` table — see supabase/migrations/*_pro_users.sql
// and CLAUDE.md. Read-only from the API on purpose: a row is granted by
// hand (SQL editor) or by the signup trial trigger, never by a client
// request — there's no POST/PATCH/DELETE route for this resource.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type ProStatus = {
  isPro: boolean;
  isTrial: boolean;
  proExpiresAt: string | null;
};

export async function getProStatus(db: SupabaseClient, userId: string): Promise<ProStatus> {
  const { data, error } = await db
    .from('pro_users')
    .select('expires_at, note')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const expiresAt = (data?.expires_at as string | null) ?? null;
  // Re-checked here rather than trusted as a plain "row exists" — a trial
  // that was active last time this was read may have lapsed since.
  const isPro = Boolean(data) && (!expiresAt || new Date(expiresAt) > new Date());

  return {
    isPro,
    isTrial: isPro && data?.note === 'trial',
    proExpiresAt: isPro ? expiresAt : null,
  };
}
