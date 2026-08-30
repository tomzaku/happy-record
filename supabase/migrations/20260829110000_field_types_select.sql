-- Two more field types: 'select' (pick one of a fixed list of options) and 'multiselect' (pick
-- any number of them) — e.g. "Mood" (one of Great/Good/Okay/Bad) or "Muscle Groups Worked"
-- (any of Chest/Back/Legs/Arms/Core).
--
-- 'select''s own value is a plain string (the chosen option) — same shape a 'text'-type field's
-- own `value_text` already holds (see 20260829070000_field_types_text_date.sql), no schema
-- change needed for it. 'multiselect' needs to hold *several* chosen options at once though,
-- which doesn't fit `checklist_records.value_text`'s own plain-string shape directly — rather
-- than adding a third value column just for this one type, the client JSON-encodes the chosen
-- array into that same text column (see packages/global/src/lib/multiselectValue.ts's own
-- serializeMultiselect/parseMultiselect), the same "a text column, JSON on the way in/out, only
-- the layer that actually needs the real shape ever parses it" convention `notes.value` already
-- uses for Editor.js content. `checklist_records` itself needs no migration either way —
-- `value_text` doesn't care what string it's holding.
alter table fields drop constraint if exists fields_type_check;
alter table fields add constraint fields_type_check
  check (type in ('number', 'note', 'text', 'date', 'datetime', 'select', 'multiselect'));

-- The fixed list of choices a select/multiselect field offers — only meaningful for those two
-- types (same "only meaningful for its own type" shape `unit`/`defaultValue` already have on
-- this table), but *required* for them specifically: a select field with no options to pick from
-- isn't a valid field, so this is a real CHECK, not just a doc comment saying so (see CLAUDE.md's
-- own "a column that should only ever hold one of two values gets a CHECK" convention).
alter table fields add column if not exists options text[];
alter table fields add constraint fields_options_required_for_select
  check (type not in ('select', 'multiselect') or (options is not null and array_length(options, 1) > 0));
