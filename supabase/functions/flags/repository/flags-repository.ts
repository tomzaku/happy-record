// Plain data access for `flags` — no business logic, no authorization decisions, just queries.
// `services/flags-service.ts` is the only thing that calls this; `api/` never reaches in here
// directly (see CLAUDE.md's "Authorization: app layer, not RLS").

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchFlags(db: SupabaseClient, userId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db.from('flags').select('*').eq('user_id', userId).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function upsertFlag(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('flags').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

export async function removeFlag(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('flags').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
