-- 4th independent widget layout choice — the "Take the Challenge" CTA button's own visual style
-- (plain/fire/water/colorful), same reasoning and shape as the 3 in
-- 20260906020000_challenge_widget_layouts.sql: a fixed small set, owner-picked in the invite
-- page's own config drawer, independent of the other widgets' own layouts.
alter table challenges
  add column if not exists button_widget_layout text not null default 'plain'
    check (button_widget_layout in ('plain', 'fire', 'water', 'colorful'));
