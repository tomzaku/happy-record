-- A task's own short summary line and its longer write-up. `short_description` is a plain column
-- (read/displayed whole, never queried by content, same as `title`). `note_id` follows
-- `field_groups.note_id`'s own pattern (20260829010000_notes_note_id_ownership.sql): the real,
-- rich-text description (Editor.js content, AI-generate) lives in `notes`, addressed by id rather
-- than duplicated as a second jsonb blob here — see 20260912020000_notes_checklist_template_owner_type.sql
-- for widening `notes.owner_type` to allow this new owner shape.
alter table checklist_templates add column if not exists short_description text;
alter table checklist_templates add column if not exists note_id text references notes (id) on delete set null;
