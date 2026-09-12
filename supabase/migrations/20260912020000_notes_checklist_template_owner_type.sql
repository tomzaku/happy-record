-- A checklist template's own long-form description reuses the notes system (rich Editor.js
-- content, AI-generate) the same way a field group's Home note already does — see
-- checklist_templates.note_id (20260912010000_checklist_templates_description.sql) and
-- notes-access-service.ts's own checkReadNote/isReadable for the read rule (owner, or anyone if
-- the template itself is `visibility: 'public'`; write stays owner-only, same as every other
-- note). Unlike a field group's note, there's no participant-fork concept here — a challenge
-- participant only ever reads this one, never gets their own copy.
--
-- Widening the owner_type allow-list and the "group-shaped owners need checklist_template_id too"
-- check (20260829020000_notes_title_search_owner.sql) to include this third shape. Constraint
-- names match Postgres' own default naming for the inline `check` that migration added.
alter table notes drop constraint if exists notes_owner_type_check;
alter table notes add constraint notes_owner_type_check
  check (owner_type in ('field', 'field_group', 'checklist_template'));

alter table notes drop constraint if exists notes_group_owner_has_template_chk;
alter table notes add constraint notes_group_owner_has_template_chk
  check (owner_type not in ('field_group', 'checklist_template') or checklist_template_id is not null);
