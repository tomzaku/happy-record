// Plain data access for `checklist-logs` — no business logic, no authorization decisions, just a
// read. The write path (`recordChecklistLog`) lives in `supabase/shared/checklistLogs.ts` instead,
// since it's called from several other resources' own services, not this one (see that file's own
// header comment).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type ChecklistLogsQuery = { checklistTemplateId?: string; actions: string[]; limit: number };

export async function fetchChecklistLogs(
  db: SupabaseClient,
  userId: string,
  query: ChecklistLogsQuery,
): Promise<Record<string, unknown>[]> {
  // An empty `actions` list (every category explicitly excluded) means "show nothing" — skip the
  // query rather than relying on undefined PostgREST behavior for `.in('action', [])`.
  if (!query.actions.length) return [];

  let q = db
    .from('checklist_logs')
    .select('*')
    .eq('user_id', userId)
    .in('action', query.actions)
    .order('created_at', { ascending: false })
    .limit(query.limit);
  if (query.checklistTemplateId) q = q.eq('checklist_template_id', query.checklistTemplateId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}
