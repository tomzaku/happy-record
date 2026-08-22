-- The three defaults every device seeds locally
-- (defaultRecordField in packages/global/src/store/record-field/useRecordField.tsx)
-- get a canonical, unowned row here instead of each user racing to claim
-- 'duration'/'push-ups'/'note' as their own — see the "fields" table
-- comment in 20260820010000_init_checklists.sql. Run as a migration (not
-- through the API) because it needs to bypass the ownership RLS policy —
-- there's no user to own these.

insert into fields (id, user_id, title, icon, description, type, unit, visibility)
values
  ('duration', null, 'Duration', 'solar:clock-square-broken',
   'Record duration for tracking purpose', 'metric', 'minutes', 'public'),
  ('push-ups', null, 'Push-ups', 'iconoir:gym',
   'Push-ups for tracking purpose', 'metric', 'reps', 'public'),
  ('note', null, 'Note', 'solar:notebook-minimalistic-linear',
   'Write anything', 'note', 'words', 'public')
on conflict (id) do nothing;
