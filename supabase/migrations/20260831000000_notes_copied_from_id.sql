-- A participant no longer edits a field-group's own (owner's) note in place — they get their
-- own personal copy instead, the same fork-on-write model `fields.copied_from_id` and
-- `checklist_templates.copied_from_id` already established (see 20260824010000_field_defaults_
-- and_forking.sql). `copied_from_id` here points back at the note this one was copied from at
-- fork time; `on delete set null` rather than cascade, since the fork is a real, independent note
-- of its own from that point on — deleting the original shouldn't take a participant's copy with
-- it, just orphan the back-reference (mirroring the two existing `copied_from_id` columns' own
-- delete behavior).
alter table notes
  add column if not exists copied_from_id text references notes (id) on delete set null;

create index if not exists idx_notes_copied_from_id on notes (copied_from_id);
