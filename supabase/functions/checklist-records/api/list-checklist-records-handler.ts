// `GET /checklist-records` — always the caller's own, nothing to compose a `checkPermission`
// around. A challenge dashboard's own peer-read of *other* participants' checklist_records
// happens in `challenges/index.ts`, on its own explicit query — not here.

import { limitOf, toChecklistRecord } from '../../../dto/checklist-records/checklist-records-dto.ts';
import type { Ctx } from './checklist-records-context.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_PAGE = 1000;

/** The real `{ value, title }` for every `note_id` referenced among a page of
 * `checklist_records` rows, keyed by that id — a single by-id lookup, not a second
 * range-filtered query (see this resource's own index.ts doc comment). */
async function resolveNotes(
  db: SupabaseClient,
  userId: string,
  noteIds: string[],
): Promise<Map<string, { value: unknown; title: string }>> {
  const map = new Map<string, { value: unknown; title: string }>();
  if (!noteIds.length) return map;
  const { data, error } = await db
    .from('notes')
    .select('id, value, title')
    .eq('user_id', userId)
    .in('id', noteIds);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as { id: string; value: string; title: string | null }[]) {
    let value: unknown = row.value;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        // Tolerant of a legacy plain-text value, same as noteApi.ts's own parseValue — kept
        // as-is rather than discarded.
      }
    }
    map.set(row.id, { value, title: row.title ?? '' });
  }
  return map;
}

export async function listChecklistRecordsHandler({ url, db, userId }: Ctx) {
  const templateId = url.searchParams.get('checklistTemplateId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fieldIds = (url.searchParams.get('fieldIds') ?? '').split(',').filter(Boolean);
  const limit = limitOf(url.searchParams.get('limit'), DEFAULT_PAGE);

  let q = db
    .from('checklist_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (templateId) q = q.eq('checklist_template_id', templateId);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  if (fieldIds.length) q = q.in('field_id', fieldIds);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];

  const noteIds = rows
    .map(r => r.note_id)
    .filter((id): id is string => typeof id === 'string');
  const notesById = await resolveNotes(db, userId, noteIds);

  const records = rows.map(r =>
    toChecklistRecord(r, typeof r.note_id === 'string' ? notesById.get(r.note_id) : undefined),
  );
  return { records };
}
