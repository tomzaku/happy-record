// Plain data access for `checklists` — every query is already explicitly `.eq('user_id',
// userId)`, own-row-only (see CLAUDE.md's "Authorization: app layer, not RLS"), so there's no
// separate access-service here the way a resource with a real cross-user decision has — the
// api/ handlers call straight into this repository.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_LIMIT = 2000;

export async function fetchChecklists(
  db: SupabaseClient,
  userId: string,
  opts: { templateId?: string | null; from?: string | null; to?: string | null },
): Promise<Record<string, unknown>[]> {
  let q = db.from('checklists').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(MAX_LIMIT);
  if (opts.templateId) q = q.eq('checklist_template_id', opts.templateId);
  if (opts.from) q = q.gte('started_at', opts.from);
  if (opts.to) q = q.lte('started_at', opts.to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function fetchChecklistById(
  db: SupabaseClient,
  userId: string,
  id: string,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await db.from('checklists').select('*').eq('user_id', userId).eq('id', id).limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function saveChecklist(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('checklists').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

export async function deleteChecklist(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('checklists').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
