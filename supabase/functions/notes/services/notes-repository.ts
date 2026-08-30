// Plain data access for `notes` — no authorization decisions here, just reads other
// services/handlers build on. See `notes-access-service.ts` for the permission layer built on
// top of this.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type NoteRow = Record<string, unknown>;

export async function fetchNoteRow(db: SupabaseClient, id: string): Promise<NoteRow | null> {
  const { data, error } = await db.from('notes').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as NoteRow) ?? null;
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
