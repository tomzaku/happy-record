// Plain data access for `checklist-templates` — no authorization decisions here, just reads
// `checklist-templates-access-service.ts` builds on. See `notes/repository/notes-repository.ts`
// for the reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchTemplateRow(db: SupabaseClient, id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db.from('checklist_templates').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) ?? null;
}

// Excludes soft-deleted rows — an owner's own "all mine" list shouldn't keep showing what they
// deleted. A joined participant's own read (fetchTemplatesByIds below) deliberately does NOT
// filter these out — see its own comment.
export async function fetchOwnedTemplates(db: SupabaseClient, userId: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('checklist_templates')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

/** A joined challenge's template is owned by whoever shared it, not the caller — see
 * useJoinChallenge.tsx's own comment on why joining never forks it into a caller-owned row. */
export async function fetchJoinedTemplateIds(db: SupabaseClient, userId: string, limit: number): Promise<string[]> {
  const { data, error } = await db
    .from('challenge_participants')
    .select('checklist_template_id')
    .eq('user_id', userId)
    .limit(limit);
  if (error) throw new Error(error.message);
  return [...new Set(((data ?? []) as Record<string, unknown>[]).map(r => r.checklist_template_id as string))];
}

// Deliberately includes soft-deleted rows — used for a joined-challenge template
// (listOwnedAndJoinedTemplates), which a participant still needs to resolve (flagged, via the
// DTO's own `deletedAt`) so their client can show "this was deleted" instead of the row just
// disappearing with no explanation.
export async function fetchTemplatesByIds(db: SupabaseClient, ids: string[]): Promise<Record<string, unknown>[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('checklist_templates').select('*').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function upsertTemplate(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('checklist_templates').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

/** Owner-only — a caller who doesn't own `id` matches nothing, a silent no-op (see
 * update-checklist-template-handler.ts's own doc comment on why `repeat` is handled separately). */
export async function patchTemplate(
  db: SupabaseClient,
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from('checklist_templates').update(patch).eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}

// A soft delete, not a real row removal — see 20260905000000_checklist_templates_soft_delete.sql
// for why. Owner-only, same as patchTemplate above: a caller who doesn't own `id` matches
// nothing, a silent no-op — including a participant "leaving" via useLeaveChallenge.tsx's own
// reuse of this same route, which never owns the row it's nominally "deleting."
export async function removeTemplate(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db
    .from('checklist_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}
