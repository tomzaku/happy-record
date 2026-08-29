-- Renaming the `metric` field type to `number` — clearer name for what it actually holds (a
-- plain numeric value), and reads better alongside the other type names added just before this
-- (note/text/date/datetime — see 20260829070000_field_types_text_date.sql). No backfill of
-- existing rows here on purpose — this app has no real user data yet, so the constraint change
-- below is the whole migration; a fresh `supabase db reset` is what picks it up, not an UPDATE
-- statement. (The seed migration itself — 20260821000000_seed_system_fields.sql — was edited in
-- place to insert `'number'` directly, since that's the seed *definition*, not existing data.)
alter table fields drop constraint if exists fields_type_check;
alter table fields add constraint fields_type_check
  check (type in ('number', 'note', 'text', 'date', 'datetime'));
