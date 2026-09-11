-- The "Check-ins per day" trend chart's own chart type (bar/line/area) on the challenge
-- dashboard — independent of each target's own chartType (stored inline in the `targets` jsonb,
-- since that's owner-defined config with no fixed row of its own): check-ins isn't a target, just
-- a top-level per-challenge setting. Same "fixed set, DB CHECK is the real guard" shape as every
-- other widget layout column on this table (see 20260906020000_challenge_widget_layouts.sql).
alter table challenges
  add column if not exists checkins_chart_type text not null default 'bar'
    check (checkins_chart_type in ('bar', 'line', 'area'));
