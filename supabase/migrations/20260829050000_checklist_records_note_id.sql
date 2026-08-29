-- Every field submitted through checklist-records now gets a real `checklist_records` row,
-- metric or note — a note-type field's own entry used to skip this table entirely (see
-- 20260829040000_notes_via_checklist_records.sql), living only in `notes`, which meant reading
-- "this group's fields for today" needed two separate range-filtered queries (checklist_records
-- + notes) merged client-side in checklist-records/index.ts's own list(). It also meant `save()`
-- had to tell metric and note entries apart *before* writing anything, which briefly relied on a
-- `fields` table lookup that could (and did) fail closed on an unresolved id.
--
-- `note_id` closes the gap: a note-type entry's own `checklist_records` row carries no value of
-- its own (value_number/value_text both null) and instead points at the `notes` row holding the
-- real content. Same id on both rows by construction — see _shared/checklistRecords.ts's own
-- fromChecklistFieldNoteEntry — so `checklist_records.id = notes.id` whenever `note_id` is set,
-- and `note_id` is just that same value written a second time as a real FK. `list()` now reads
-- one range-filtered table and resolves referenced notes afterward by id, not a second
-- range-filtered query against `notes`.

alter table checklist_records add column if not exists note_id text references notes (id) on delete set null;

-- Was "exactly one of value_number/value_text" — now a note-type row swaps both of those out for
-- `note_id` instead of holding a value directly, so the shapes need to stay mutually exclusive.
alter table checklist_records drop constraint if exists checklist_records_value_shape;
alter table checklist_records add constraint checklist_records_value_shape check (
  (note_id is not null and value_number is null and value_text is null)
  or
  (note_id is null and num_nonnulls(value_number, value_text) = 1)
);

create index if not exists idx_checklist_records_note_id
  on checklist_records (note_id) where note_id is not null;
