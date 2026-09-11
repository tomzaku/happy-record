-- Owner-picked fields shown on the dashboard's own "Record Detail" section — everyone's raw
-- per-field contribution (a plain sum, no goal/formula the way `targets` has one). A real
-- `text[]` column rather than another jsonb blob: the shape is fully known (a list of field ids)
-- and nothing about it needs the nested-object flexibility `targets` actually uses its jsonb for.
alter table challenges
  add column if not exists record_detail_field_ids text[] not null default '{}';
