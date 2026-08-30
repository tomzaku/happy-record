// A `multiselect`-type field's own record value — several chosen options at once, which doesn't
// fit `ChecklistRecord.value`'s own `number | string` shape directly (see RecordField.type's own
// doc comment and 20260829110000_field_types_select.sql). Encoded as a JSON string instead of a
// real array so nothing about the type, the wire format, or `checklist_records.value_text` has
// to change — the same "a text column, JSON on the way in/out" convention `notes.value` already
// uses for Editor.js content, just scoped to this one field type instead of every note. Every
// multiselect input/display in the app (ChecklistFieldGroupAdd's Submit form,
// ChecklistFieldGeneral's History edit-in-place, fieldValueFormat's own read-only display) goes
// through this one module instead of re-deriving the encoding.

/** Tolerant of a value that isn't valid JSON yet (a field just switched to `multiselect`, or a
 * genuinely malformed row) — yields `[]` rather than throwing, same tolerance `toBlocks` (in
 * aiNoteGeneration.ts) has for the same class of problem. */
export function parseMultiselect(value: unknown): string[] {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function serializeMultiselect(selected: string[]): string {
  return JSON.stringify(selected);
}
