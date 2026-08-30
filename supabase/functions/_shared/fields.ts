// Row mapping + validation for the `fields` resource (table: `fields`). See
// packages/global/src/store/record-field/useRecordField.tsx for the client
// shape (RecordField) this mirrors — only the table/resource dropped the
// "record" prefix, not the client-side type or hook.

// 'text'/'date'/'datetime' are all a plain string value, same as a `number`-type field's own
// `value_text` branch already was — see checklist-records/index.ts's `isNoteEntry` and
// _shared/checklistRecords.ts's `fromRecordEntry`, neither of which needs to know about these
// three specifically. `date`/`datetime` are stored as a full ISO 8601 timestamp, never truncated
// to a bare date string server-side — this file just passes the string through unchanged; a
// `date`-type field's own "just the day" display is purely a client-side formatting choice.
//
// 'number' was 'metric' until 20260829080000_field_type_metric_to_number.sql — no backfill of
// existing rows, since this app has no real user data yet (a fresh `supabase db reset` is what
// actually picks the rename up).
//
// 'select'/'multiselect' (20260829110000_field_types_select.sql) each need a real `options`
// list to mean anything — validated below, not just documented. 'select''s own record value is
// a plain string like 'text' already is; 'multiselect''s is a JSON-encoded array of strings in
// that same `value_text` column — see that migration's own comment and
// packages/global/src/lib/multiselectValue.ts's own serializeMultiselect/parseMultiselect for
// where that encoding actually happens (never here; this file only ever touches the field's own
// row, not a submitted record's value).
export const FIELD_TYPES = ['number', 'note', 'text', 'date', 'datetime', 'select', 'multiselect'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export const isFieldType = (v: unknown): v is FieldType => (FIELD_TYPES as readonly string[]).includes(v as string);
const SELECT_TYPES = new Set<FieldType>(['select', 'multiselect']);

export function toRecordField(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    icon: r.icon as string,
    description: (r.description as string) ?? '',
    type: r.type as string,
    unit: (r.unit as string) ?? '',
    ...(Array.isArray(r.options) && r.options.length ? { options: r.options as string[] } : {}),
    visibility: (r.visibility as string) ?? 'private',
    ...(r.default_value_number !== null && r.default_value_number !== undefined
      ? { defaultValue: Number(r.default_value_number) }
      : {}),
    ...(r.copied_from_id ? { copiedFromId: r.copied_from_id as string } : {}),
    // Only meaningful for type: 'note' — this field's own single current note. See
    // 20260829010000_notes_note_id_ownership.sql.
    ...(r.note_id ? { noteId: r.note_id as string } : {}),
    updatedAt: r.updated_at as string,
  };
}

export function fromRecordField(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.title !== 'string' || !e.title) throw new Error('Missing title.');
  if (typeof e.icon !== 'string' || !e.icon) throw new Error('Missing icon.');
  if (!isFieldType(e.type)) throw new Error('Invalid type.');

  const options = Array.isArray(e.options)
    ? e.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
    : [];
  // Same requirement the table's own `fields_options_required_for_select` CHECK enforces — caught
  // here first so a select field with no real options gets a normal 400, not a raw Postgres
  // constraint-violation error surfacing through the generic 500 handler.
  if (SELECT_TYPES.has(e.type) && options.length === 0) {
    throw new Error('A select/multiselect field needs at least one option.');
  }

  return {
    id: e.id,
    title: e.title,
    icon: e.icon,
    description: typeof e.description === 'string' ? e.description : '',
    type: e.type,
    unit: typeof e.unit === 'string' ? e.unit : '',
    options: options.length ? options : null,
    // Never trusted from the client, regardless of what's sent — a public field would be usable
    // in *anyone's* checklist template (fields/index.ts's own "owner OR public" read rule), and
    // a real user's own field becoming that is never something this route should grant on
    // request. The three seeded defaults (`duration`/`push-ups`/`note`,
    // 20260821000000_seed_system_fields.sql) are the only public fields that exist, written by a
    // migration under the service role, which bypasses this mapping function entirely — that's
    // the only path to `visibility: 'public'` now. A shared checklist template's own fields stay
    // private too; a recipient resolves them through `GET /fields?templateId=` instead (see that
    // route's own comment), authorized by the template being public, not by the field itself.
    visibility: 'private',
    // number-only in practice (the client only shows this input for
    // type: 'number') but not enforced here — a stray value on a note field
    // is harmless, just never read.
    default_value_number: typeof e.defaultValue === 'number' ? e.defaultValue : null,
    // Lineage only, set once at fork time (see useJoinChallenge.tsx) — never
    // read for access control, so no validation beyond "is it a string".
    copied_from_id: typeof e.copiedFromId === 'string' ? e.copiedFromId : null,
    note_id: typeof e.noteId === 'string' ? e.noteId : null,
    // Postgres only fills `updated_at`'s default on insert, not update —
    // an upsert has to set it explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
