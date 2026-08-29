-- Centralizes every note surface onto `notes`, not just the standalone notebook: a checklist
-- template's own field-group "Home" note (previously jsonb on
-- checklist_templates.field_groups[].note) and a `type: 'note'` field's per-day value inside a
-- checklist (previously checklist_records.value_text). See CLAUDE.md and
-- packages/global/src/store/note/useNote.tsx for why notes live in their own table at all.
--
-- No backfill: existing field_groups[].note / checklist_records note-type rows are left as-is
-- (field_groups is opaque jsonb the client just stops reading `.note` from; value_text rows for
-- note-type fields become orphaned data, not read by anything after this ships).

-- `field_id` used to be every note's identity; a field-group note has no `fields` row at all, so
-- it has to become optional now that a note can be identified by `field_group_id` instead.
alter table notes alter column field_id drop not null;

-- `checklist_id` — a `type: 'note'` field's value for one specific day/checklist instance. Not a
-- foreign key: same "arrives before its parent" tolerance `checklist_records.checklist_id`
-- already has (a write racing a device coming back online, etc).
alter table notes add column if not exists checklist_id text;

-- `checklist_template_id` + `field_group_id` — a field group's own persistent Home-tab note.
-- Neither is a foreign key, for the same reason as `checklist_id` above (field_group_id also
-- isn't a row in any table of its own — it only ever existed inside field_groups' jsonb).
alter table notes add column if not exists checklist_template_id text;
alter table notes add column if not exists field_group_id text;

-- Exactly one of the two note-kinds a row can be: a plain note-type-field note (`field_id`) or a
-- field-group's own note (`field_group_id`) — never both, never neither. Matches CLAUDE.md's "a
-- column that should only hold one of N values gets a CHECK" convention.
alter table notes add constraint notes_field_or_group_chk
  check ((field_id is null) <> (field_group_id is null));

-- A field-group note is meaningless without knowing which template it belongs to.
alter table notes add constraint notes_group_has_template_chk
  check (field_group_id is null or checklist_template_id is not null);

create index if not exists idx_notes_user_checklist on notes (user_id, checklist_id);
create index if not exists idx_notes_user_field_group on notes (user_id, field_group_id);
