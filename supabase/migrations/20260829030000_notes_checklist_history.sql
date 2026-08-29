-- Brings back a per-day journal for a `type: 'note'` field used inside a checklist template's
-- field group — the "one note per field, everywhere" model from
-- 20260829010000_notes_note_id_ownership.sql only ever fit the standalone notebook well
-- (fields.note_id genuinely is one current note there); inside a checklist, a note-type field
-- behaves like every other field on the Submit/History tabs — a new entry each time you submit,
-- shown per day.
--
-- `owner_type`/`owner_id` (20260829020000_notes_title_search_owner.sql) still say *which field*
-- a note belongs to either way. `checklist_id` is what tells the two apart now: null means "the
-- field's own single current note" (fields.note_id points at it, standalone notebook), set means
-- "this field's value for one specific day's checklist" (many rows, one per submission — never
-- pointed at by fields.note_id at all). `checklist_template_id` rides along for the same reason
-- checklist_records.checklist_template_id is denormalized (see CLAUDE.md): every History read
-- queries "this template's notes in this date range" directly.

alter table notes add column if not exists checklist_id text;

create index if not exists idx_notes_owner_checklist on notes (user_id, owner_id, checklist_id);
create index if not exists idx_notes_owner_template_range on notes (user_id, owner_id, checklist_template_id, created_at);
