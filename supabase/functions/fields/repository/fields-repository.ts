// Plain data access for `fields` — no authorization decisions here, just reads
// `fields-access-service.ts` builds on. See `notes/repository/notes-repository.ts` for the
// reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Moved to `shared/` once `challenges` needed it too — see that file's own header.
export { fetchFieldIdsReferencedByTemplate } from '../../../shared/fieldGroupFields.ts';

export async function fetchPublicTemplateId(db: SupabaseClient, templateId: string): Promise<string | null> {
  const { data, error } = await db
    .from('checklist_templates')
    .select('id')
    .eq('id', templateId)
    .eq('visibility', 'public')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function fetchFieldsByIds(db: SupabaseClient, ids: string[]): Promise<Record<string, unknown>[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('fields').select('*').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

/** Own fields plus anyone's public ones — an explicit rule, not an implicit RLS filter. */
export async function fetchOwnOrPublicFields(
  db: SupabaseClient,
  userId: string,
  ids: string[],
): Promise<Record<string, unknown>[]> {
  let query = db.from('fields').select('*').or(`user_id.eq.${userId},visibility.eq.public`);
  if (ids.length) query = query.in('id', ids);
  const { data, error } = await query.order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function upsertField(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('fields').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

export async function removeField(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('fields').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
