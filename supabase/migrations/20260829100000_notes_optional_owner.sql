-- A note no longer has to belong to a field/field-group at all — the Notes page's own "+" used
-- to force every new standalone note through a one-note-per-field slot (create/reuse a `type:
-- 'note'` field just to hold it), which only made sense back when a field *was* the only way to
-- organize notes. Real folders exist now (20260821010000_notes.sql's own `note_folders`, wired
-- up client-side in note-manager-page-ui), so a plain "just a note, no field" is a real, first-
-- class case rather than something to route around.
--
-- `owner_type`/`owner_id` (20260829020000_notes_title_search_owner.sql) stay exactly what they
-- always were for a note that *does* have one — the reverse pointer back to whichever field/
-- field-group's own `note_id` points here. Dropping `not null` just stops forcing every note to
-- have one. The existing CHECK constraints already tolerate this without changes: a plain SQL
-- `check` treats a NULL operand as passing (neither TRUE nor FALSE disqualifies a row), so
-- `owner_type in ('field','field_group')` and `notes_group_owner_has_template_chk` both already
-- pass for `owner_type is null`.
alter table notes alter column owner_type drop not null;
alter table notes alter column owner_type drop default;
alter table notes alter column owner_id drop not null;
alter table notes alter column owner_id drop default;
