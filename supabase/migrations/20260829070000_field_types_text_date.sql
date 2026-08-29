-- Three more field types beyond metric/note: 'text' (short text), 'date', 'datetime' (date &
-- time). None of them need a schema change on `checklist_records` itself — a text/date/datetime
-- value is a plain string exactly like a metric field's own `value_text` branch already was
-- (see 20260820010000_init_checklists.sql's own value_number/value_text split), so it lands in
-- the same column, distinguished from a metric's own string-shaped value only by `fields.type`,
-- which the client already reads to decide how to render/format it. Only `fields.type`'s own
-- CHECK needs widening to actually allow saving one.
--
-- `date`/`datetime` are stored as a full ISO 8601 timestamp either way, never truncated to a
-- bare date string server-side — see _shared/fields.ts and checklist-records/index.ts, which
-- both just pass a string value through unchanged. Formatting a `date`-type field down to
-- "just the day" for display is a client-side concern only.
alter table fields drop constraint if exists fields_type_check;
alter table fields add constraint fields_type_check
  check (type in ('metric', 'note', 'text', 'date', 'datetime'));
