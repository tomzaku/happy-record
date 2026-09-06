-- Three independent layout choices for the shared "take the challenge" page
-- (checklist-template-shared-page-ui), one per widget — the owner picks each separately rather
-- than one setting governing all three (start date, invitation message, and targets are
-- unrelated pieces of content with their own layout needs). Same reasoning as
-- 20260825010000_challenge_theme.sql's own theme column: each is a fixed, small set so the
-- client ships one component per value instead of validating arbitrary input into a renderer.
-- Owner-only to set, covered by the same existing owner-only-write/anyone-who-can-read-the-
-- template-can-read policy as theme (just more columns on the same row).
alter table challenges
  add column if not exists start_widget_layout text not null default 'countdown'
    check (start_widget_layout in ('countdown', 'date', 'both')),
  add column if not exists greeting_widget_layout text not null default 'heading'
    check (greeting_widget_layout in ('heading', 'banner', 'minimal')),
  add column if not exists targets_widget_layout text not null default 'list'
    check (targets_widget_layout in ('list', 'tiles', 'combined'));
