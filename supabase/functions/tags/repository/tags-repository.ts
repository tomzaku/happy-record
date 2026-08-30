// Plain data access for `tags` — every query is already explicitly `.eq('user_id', userId)`,
// own-row-only (see CLAUDE.md's "Authorization: app layer, not RLS"), so there's no separate
// access-service here the way a resource with a real cross-user decision has — the api/ handlers
// call straight into this repository.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchTags(db: SupabaseClient, userId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db.from('tags').select('*').eq('user_id', userId).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function saveTag(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('tags').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

export async function deleteTag(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('tags').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
