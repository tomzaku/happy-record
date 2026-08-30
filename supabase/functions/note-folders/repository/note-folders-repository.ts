// Plain data access for `note-folders` — every query is already explicitly `.eq('user_id',
// userId)`, own-row-only (see CLAUDE.md's "Authorization: app layer, not RLS"), so there's no
// separate access-service here the way a resource with a real cross-user decision has — the
// api/ handlers call straight into this repository.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchNoteFolders(db: SupabaseClient, userId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('note_folders')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function saveNoteFolder(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('note_folders').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

export async function deleteNoteFolder(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('note_folders').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
