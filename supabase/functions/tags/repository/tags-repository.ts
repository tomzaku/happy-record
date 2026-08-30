// Plain data access for `tags` — no business logic, no authorization decisions, just queries.
// `services/tags-service.ts` is the only thing that calls this; `api/` never reaches in here
// directly (see CLAUDE.md's "Authorization: app layer, not RLS").

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchTags(db: SupabaseClient, userId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db.from('tags').select('*').eq('user_id', userId).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function upsertTag(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('tags').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

export async function removeTag(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('tags').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
