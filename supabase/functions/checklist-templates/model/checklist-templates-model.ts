// Row mapping + validation for the `checklist-templates` resource. See
// packages/global/src/store/checklists/useChecklistTemplates.tsx for the
// client shape (`ChecklistTemplate`) this mirrors.
//
// `avatar` and `tags` round-trip as given — they're config the server never filters on, not
// relational data (see the migration's comment on why only ownership + visibility are real
// columns). `flagId`/`flag_id` is the exception: a real foreign key into `flags` (see
// 20260821030000_flags.sql) — one flag groups many templates, unlike `tags`. The deprecated
// `records: string[]` field is dropped: it's unused in the client type already
// (`@deprecated use groups instead`) and never makes it to the wire here. `fieldGroups` isn't
// handled here at all anymore — it's the `field-groups` resource now (see
// 20260829010000_notes_note_id_ownership.sql), fetched separately and merged onto the client
// object by useChecklistTemplates.tsx, not embedded in this row. `repeat` moved the same way, one
// migration later — see 20260830000000_repeats_table.sql — except it's still embedded in this
// row on the wire: `toChecklistTemplate`'s caller (checklist-templates/services and api) fetches the
// matching `repeats` row itself and passes it in, so the client-facing shape never changed.
// `isPersonalOverride` is the one addition: true when the caller (checklist-templates/services and api)
// determined the resolved `repeatRow` is a challenge participant's own row, not the owner's —
// annotated onto `repeat.isPersonal` (see ChecklistTemplate['repeat'] in
// useChecklistTemplates.tsx) so the client can tell "this is my personal reminder" from "this is
// just the group's default" without knowing anything about how it was resolved.

import { toRepeat } from '../../../shared/repeats.ts';

export function toChecklistTemplate(
  r: Record<string, unknown>,
  repeatRow: Record<string, unknown> | undefined,
  isPersonalOverride: boolean,
) {
  const repeat = toRepeat(repeatRow);
  return {
    id: r.id as string,
    title: r.title as string,
    avatar: (r.avatar as Record<string, unknown>) ?? {},
    repeat: repeat && isPersonalOverride ? { ...repeat, isPersonal: true } : repeat,
    createdAt: r.created_at as string,
    records: [] as string[],
    tags: (r.tags as string[]) ?? [],
    visibility: (r.visibility as string) ?? 'private',
    updatedAt: r.updated_at as string,
    ...(r.flag_id ? { flagId: r.flag_id as string } : {}),
    ...(r.copied_from_id ? { copiedFromId: r.copied_from_id as string } : {}),
  };
}

/**
 * Partial update — only the keys the caller actually sent become columns to
 * write. Used by the PATCH route so editing one field (a note, a schedule)
 * can't clobber other columns with a stale client copy the way a full-row
 * `fromChecklistTemplate` upsert would (that stays POST/create-only).
 */
export function patchChecklistTemplate(e: Record<string, unknown>): Record<string, unknown> {
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  const patch: Record<string, unknown> = {};

  if ('title' in e) {
    if (typeof e.title !== 'string' || !e.title) throw new Error('Invalid title.');
    patch.title = e.title;
  }
  if ('avatar' in e) {
    patch.avatar = e.avatar && typeof e.avatar === 'object' ? e.avatar : {};
  }
  // `repeat` isn't a column on this row anymore — the PATCH route (checklist-templates/services and api)
  // writes it to `repeats` itself via saveRepeat() when `'repeat' in params`, same as it does for
  // the full-row save() path.
  if ('tags' in e) {
    patch.tags = Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [];
  }
  if ('visibility' in e) {
    patch.visibility = e.visibility === 'public' ? 'public' : 'private';
  }
  if ('flagId' in e) {
    patch.flag_id = str(e.flagId);
  }
  if ('copiedFromId' in e) {
    patch.copied_from_id = str(e.copiedFromId);
  }

  // Postgres only fills the default on insert, not update — every write
  // has to set this explicitly, partial or not.
  patch.updated_at = new Date().toISOString();
  return patch;
}

export function fromChecklistTemplate(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.title !== 'string' || !e.title) throw new Error('Missing title.');

  const str = (v: unknown) => (typeof v === 'string' ? v : null);

  return {
    id: e.id,
    title: e.title,
    avatar: e.avatar && typeof e.avatar === 'object' ? e.avatar : {},
    // `repeat` isn't a column here anymore — the caller (checklist-templates/services and api) writes it
    // to `repeats` itself via saveRepeat(), after this row exists (the FK needs a parent to point
    // at) — see 20260830000000_repeats_table.sql.
    tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
    visibility: e.visibility === 'public' ? 'public' : 'private',
    flag_id: str(e.flagId),
    // Lineage only, set once at fork time (see useJoinChallenge.tsx) — never
    // read for access control.
    copied_from_id: str(e.copiedFromId),
    created_at: str(e.createdAt) ?? new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
