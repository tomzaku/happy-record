// Plain data access for `notes` — no authorization decisions here, just reads other
// services/handlers build on. See `notes-access-service.ts` for the permission layer built on
// top of this.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type NoteRow = Record<string, unknown>;

// What a list (summary) read actually needs — no `value`, no `search_text` (server-only, for
// `?q=`'s own filter, never read back). Leaving `value` off the select means the query never
// reads a note's — potentially large — content off disk for a row that's only ever going to show
// a title and a short preview.
const SUMMARY_COLUMNS =
  'id, title, preview, owner_type, owner_id, folder_id, checklist_id, checklist_template_id, submission_id, created_at, updated_at';

export async function fetchNoteRow(db: SupabaseClient, id: string): Promise<NoteRow | null> {
  const { data, error } = await db.from('notes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as NoteRow) ?? null;
}

export async function fetchNoteRowsByIds(db: SupabaseClient, ids: string[]): Promise<NoteRow[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('notes').select('*').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as NoteRow[];
}

export type NoteSummaryQuery = { q?: string | null; limit: number };

export async function fetchNoteSummaries(db: SupabaseClient, userId: string, opts: NoteSummaryQuery): Promise<NoteRow[]> {
  let query = db.from('notes').select(SUMMARY_COLUMNS).eq('user_id', userId);
  if (opts.q) {
    // A real substring, not user-controlled SQL: PostgREST's `.or()` filter string still needs
    // `%`/commas/parens escaped out of it, since those are syntax there, not just in the ILIKE
    // pattern itself.
    const escaped = opts.q.replace(/[%,()]/g, char => `\\${char}`);
    const pattern = `%${escaped}%`;
    query = query
      .or(`title.ilike.${pattern},search_text.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(opts.limit);
  } else {
    query = query.order('updated_at', { ascending: false }).limit(opts.limit);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as NoteRow[];
}

export async function upsertNote(db: SupabaseClient, userId: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('notes').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

/** A journal entry (checklist_id set) has a paired `checklist_records` row — same id, per
 * checklist-records/index.ts's own fromChecklistFieldNoteEntry — whose own `updated_at` needs
 * bumping too, or that row's own last-write-wins merge on the checklist side won't realize this
 * edit (landing here, not through checklist-records' own PATCH) is newer than what it already has
 * cached. */
export async function bumpChecklistRecordUpdatedAt(
  db: SupabaseClient,
  userId: string,
  id: string,
  updatedAt: unknown,
): Promise<void> {
  const { error } = await db
    .from('checklist_records')
    .update({ updated_at: updatedAt })
    .eq('user_id', userId)
    .eq('id', id);
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

/** `limit(1)` + take the newest, not `.maybeSingle()` — this must tolerate more than one row
 * already existing for `(owner_type: 'field_group', owner_id, user_id)` from before a real bug in
 * the client's own save path (a stale `NoteEditor` callback re-deciding "create" on every edit
 * instead of ever seeing its own earlier create — see useFieldGroupNote.ts's own `startEditing`
 * comment) could leave more than one behind; `.maybeSingle()` throws on exactly that, which is
 * what turned this into a 500 rather than silently picking one. The fix stops new duplicates from
 * ever being created — this is just tolerance for ones a device already made before it shipped. */
export async function fetchOwnNoteForFieldGroup(
  db: SupabaseClient,
  fieldGroupId: string,
  userId: string,
): Promise<NoteRow | null> {
  const { data, error } = await db
    .from('notes')
    .select('*')
    .eq('owner_type', 'field_group')
    .eq('owner_id', fieldGroupId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return ((data ?? [])[0] as NoteRow | undefined) ?? null;
}

/** Which of `ownerIds` (field_group ids) belong to a `visibility: 'public'` template — the one
 * cross-table fact every read-side permission check needs. Two plain queries plus a set
 * intersection in code, not a PostgREST embed: `field_groups.checklist_template_id` isn't a real
 * foreign key (see 20260829010000_notes_note_id_ownership.sql), and keeping the actual authz
 * decision in TS rather than relationship syntax is exactly what makes it portable to a
 * different backend later. */
export async function publicFieldGroupOwnerIds(db: SupabaseClient, ownerIds: string[]): Promise<Set<string>> {
  if (!ownerIds.length) return new Set();
  const { data: groups, error: groupsError } = await db
    .from('field_groups')
    .select('id, checklist_template_id')
    .in('id', ownerIds);
  if (groupsError) throw new Error(groupsError.message);
  const rows = (groups ?? []) as { id: string; checklist_template_id: string }[];

  const templateIds = [...new Set(rows.map(g => g.checklist_template_id))];
  if (!templateIds.length) return new Set();
  const { data: templates, error: templatesError } = await db
    .from('checklist_templates')
    .select('id')
    .in('id', templateIds)
    .eq('visibility', 'public');
  if (templatesError) throw new Error(templatesError.message);
  const publicTemplateIds = new Set(((templates ?? []) as { id: string }[]).map(t => t.id));

  return new Set(rows.filter(g => publicTemplateIds.has(g.checklist_template_id)).map(g => g.id));
}
