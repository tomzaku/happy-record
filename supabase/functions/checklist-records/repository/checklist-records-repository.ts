// Plain data access for `checklist-records` — no business logic, no authorization decisions,
// just queries. `services/checklist-records-service.ts` is the only thing that calls this;
// `api/` never reaches in here directly (see CLAUDE.md's "Authorization: app layer, not RLS").

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type ChecklistRecordsQuery = {
  templateId?: string | null;
  from?: string | null;
  to?: string | null;
  fieldIds?: string[];
  limit: number;
};

export async function fetchChecklistRecords(
  db: SupabaseClient,
  userId: string,
  opts: ChecklistRecordsQuery,
): Promise<Record<string, unknown>[]> {
  let q = db
    .from('checklist_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts.limit);
  if (opts.templateId) q = q.eq('checklist_template_id', opts.templateId);
  if (opts.from) q = q.gte('created_at', opts.from);
  if (opts.to) q = q.lte('created_at', opts.to);
  if (opts.fieldIds?.length) q = q.in('field_id', opts.fieldIds);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function fetchNotesByIds(
  db: SupabaseClient,
  userId: string,
  noteIds: string[],
): Promise<{ id: string; value: string; title: string | null }[]> {
  if (!noteIds.length) return [];
  const { data, error } = await db
    .from('notes')
    .select('id, value, title')
    .eq('user_id', userId)
    .in('id', noteIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; value: string; title: string | null }[];
}

export async function upsertSubmission(
  db: SupabaseClient,
  userId: string,
  submission: { id: string; checklistId: string; checklistTemplateId: string; createdAt: string },
): Promise<void> {
  const { error } = await db.from('submissions').upsert({
    id: submission.id,
    user_id: userId,
    checklist_id: submission.checklistId,
    checklist_template_id: submission.checklistTemplateId,
    created_at: submission.createdAt,
  });
  if (error) throw new Error(error.message);
}

export async function upsertNotes(db: SupabaseClient, userId: string, noteRows: Record<string, unknown>[]): Promise<void> {
  if (!noteRows.length) return;
  const { error } = await db.from('notes').upsert(noteRows.map(row => ({ user_id: userId, ...row })));
  if (error) throw new Error(error.message);
}

export async function upsertChecklistRecords(
  db: SupabaseClient,
  userId: string,
  recordRows: Record<string, unknown>[],
): Promise<void> {
  if (!recordRows.length) return;
  const { error } = await db.from('checklist_records').upsert(recordRows.map(row => ({ user_id: userId, ...row })));
  if (error) throw new Error(error.message);
}

export async function updateChecklistRecordValue(
  db: SupabaseClient,
  userId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ submission_id: string | null } | null> {
  const { data, error } = await db
    .from('checklist_records')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', id)
    .select('submission_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { submission_id: string | null } | null;
}

export async function updateNote(
  db: SupabaseClient,
  userId: string,
  id: string,
  notePatch: Record<string, unknown>,
): Promise<{ submission_id: string | null } | null> {
  const { data, error } = await db
    .from('notes')
    .update(notePatch)
    .eq('user_id', userId)
    .eq('id', id)
    .select('submission_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { submission_id: string | null } | null;
}

export async function bumpChecklistRecordUpdatedAt(
  db: SupabaseClient,
  userId: string,
  id: string,
  updatedAt: string,
): Promise<void> {
  const { error } = await db
    .from('checklist_records')
    .update({ updated_at: updatedAt })
    .eq('user_id', userId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function bumpSubmission(
  db: SupabaseClient,
  userId: string,
  submissionId: string | null | undefined,
  updatedAt: string,
): Promise<void> {
  if (!submissionId) return;
  const { error } = await db
    .from('submissions')
    .update({ updated_at: updatedAt })
    .eq('user_id', userId)
    .eq('id', submissionId);
  if (error) throw new Error(error.message);
}

export async function removeChecklistRecord(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('checklist_records').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removeNote(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('notes').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
