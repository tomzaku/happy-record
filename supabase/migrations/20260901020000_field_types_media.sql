-- Two more field types: 'photo' and 'video' — see supabase/functions/media/ and
-- dto/media/media-dto.ts. Unlike every other type here, a photo/video field's own record value
-- isn't stored on this table at all: it's a `media` row's own id, submitted as a plain string
-- through `checklist_records.value_text` exactly like 'text' already is (see
-- 20260829070000_field_types_text_date.sql) — no `checklist_records` schema change needed either.
-- This migration only has to widen `fields.type` itself to allow the two new values; `fields-dto.ts`'s
-- own `FIELD_TYPES` was updated alongside it (20260901000000_media.sql), but that's app-layer
-- validation only — this CHECK is what actually accepted/rejected the write at the database, and
-- was missed in that same change (caught by a real "Something went wrong." 500 on the first live
-- attempt to save a video field, not a review beforehand).
alter table fields drop constraint if exists fields_type_check;
alter table fields add constraint fields_type_check
  check (type in ('number', 'note', 'text', 'date', 'datetime', 'select', 'multiselect', 'photo', 'video'));
