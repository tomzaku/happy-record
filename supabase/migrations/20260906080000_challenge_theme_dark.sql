-- Adds a 4th theme, 'dark' — designed to sit on top of an owner's own dark
-- pageBackgroundImageUrl (20260906060000_challenge_page_background_image_url.sql): translucent
-- card surfaces and light text instead of classic/ignite/playful's own light page + opaque white
-- card, so the card doesn't look like a jarring white box over a dark photo.
--
-- `add column ... check (...)` (20260825010000_challenge_theme.sql) named this constraint
-- `challenges_theme_check` (Postgres's own default naming for an inline column CHECK) — drop and
-- recreate it with the 4th value rather than adding a second, redundant CHECK on the same column.
alter table challenges
  drop constraint if exists challenges_theme_check;

alter table challenges
  add constraint challenges_theme_check check (theme in ('classic', 'ignite', 'playful', 'dark'));
