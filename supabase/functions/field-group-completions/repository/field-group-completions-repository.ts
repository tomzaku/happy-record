// Plain data access for `field-group-completions` — no business logic, no authorization
// decisions, just queries. `services/field-group-completions-service.ts` is the only thing that
// calls this; `api/` never reaches in here directly (see CLAUDE.md's "Authorization: app layer,
// not RLS").

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchFieldGroupCompletions(
  db: SupabaseClient,
  userId: string,
  checklistId: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('field_group_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('checklist_id', checklistId);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function upsertFieldGroupCompletion(
  db: SupabaseClient,
  userId: string,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await db
    .from('field_group_completions')
    .upsert({ user_id: userId, ...row }, { onConflict: 'checklist_id,field_group_id,user_id' });
  if (error) throw new Error(error.message);
}

export async function removeFieldGroupCompletion(
  db: SupabaseClient,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await db
    .from('field_group_completions')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
