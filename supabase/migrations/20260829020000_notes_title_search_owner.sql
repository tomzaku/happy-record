-- Adds what a search feature over `notes` actually needs:
--   - `title` — a real, user-editable field, separate from the rich body content.
--   - `search_text` — plain text pulled out of the Editor.js blocks in `value` (a JSON string of
--     block objects — searching that directly means matching on structural JSON too, e.g.
--     `"type":"paragraph"`, not just what the user actually wrote). Computed client-side
--     whenever a note is saved (see packages/global/src/lib/editorJsNoteBlocks.ts's
--     `blocksToSearchText`) and sent alongside `value`, same shape the server-side AI context
--     extraction in _shared/aiNoteGeneration.ts already does for the same reason, just not
--     shared code (one runs in Deno, the other in the browser bundle — same non-sharing already
--     true of that module's own block-shape knowledge).
--   - `owner_type`/`owner_id` — which side owns this note (a field's own note via `fields.note_id`,
--     or a field-group's own note via `field_groups.note_id` — see
--     20260829010000_notes_note_id_ownership.sql). The ownership relationship itself still lives
--     on that other side; these are a denormalized reverse pointer so a search result can be
--     resolved back to something openable without a reverse scan over `fields`/`field_groups`.
--     Set once at creation, alongside whichever row's `note_id` gets pointed here — never
--     changes afterward (a note doesn't change owners in this app).
--   - `checklist_template_id` — only meaningful (and only ever set) for a `field_group`-owned
--     note, which belongs to exactly one template. A `field`-owned note's own note-type field can
--     in principle be referenced by more than one field group across different templates, so
--     there's no single template id to record there — a field-owned search result opens the
--     standalone notebook instead (see CLAUDE.md's notes section).

alter table notes add column if not exists title text not null default '';
alter table notes add column if not exists search_text text not null default '';
alter table notes add column if not exists owner_type text not null default 'field'
  check (owner_type in ('field', 'field_group'));
alter table notes add column if not exists owner_id text not null default '';
alter table notes add column if not exists checklist_template_id text;

alter table notes add constraint notes_group_owner_has_template_chk
  check (owner_type <> 'field_group' or checklist_template_id is not null);

create index if not exists idx_notes_user_owner on notes (user_id, owner_type, owner_id);
