-- Renaming the `metric` field type to `number` — clearer name for what it actually holds (a
-- plain numeric value), and reads better alongside the other type names added just before this
-- (note/text/date/datetime — see 20260829070000_field_types_text_date.sql).
--
-- Needs a real backfill — the remote database already has rows with type = 'metric' (the seeded
-- `duration`/`push-ups` fields at minimum). The constraint has to be dropped *before* the
-- backfill runs, not after: `fields_type_check` at this point (from
-- 20260829070000_field_types_text_date.sql) still only allows the old five-value set, which
-- doesn't include 'number' yet — updating a row's type to 'number' while that constraint is
-- still active fails the same way inserting one straight away would.
alter table fields drop constraint if exists fields_type_check;

update fields set type = 'number' where type = 'metric';

alter table fields add constraint fields_type_check
  check (type in ('number', 'note', 'text', 'date', 'datetime'));
