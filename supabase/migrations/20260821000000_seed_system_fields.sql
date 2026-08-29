-- The three defaults every device gets — 'duration'/'push-ups'/'note' — get a canonical, unowned
-- row here instead of each user racing to claim them as their own — see the "fields" table
-- comment in 20260820010000_init_checklists.sql. Run as a migration (not through the API)
-- because it needs to bypass the ownership RLS policy — there's no user to own these.
--
-- 'metric' → 'number' here matches 20260829080000_field_type_metric_to_number.sql's own rename
-- (this file predates it) — edited in place rather than left stale, since this is the seed
-- definition itself, not a row that migration's own "no backfill" instruction was ever about.

insert into fields (id, user_id, title, icon, description, type, unit, visibility)
values
  ('duration', null, 'Duration', 'solar:clock-square-broken',
   'Record duration for tracking purpose', 'number', 'minutes', 'public'),
  ('push-ups', null, 'Push-ups', 'iconoir:gym',
   'Push-ups for tracking purpose', 'number', 'reps', 'public'),
  ('note', null, 'Note', 'solar:notebook-minimalistic-linear',
   'Write anything', 'note', 'words', 'public')
on conflict (id) do nothing;
