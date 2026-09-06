-- 5th independent widget layout choice — the challenge card's own title/icon header (avatar +
-- checklist template title), same reasoning and shape as the 4 in
-- 20260906020000_challenge_widget_layouts.sql / 20260906030000_challenge_button_widget_layout.sql:
-- a fixed small set, owner-picked in the invite page's own config drawer, independent of the
-- other widgets' own layouts.
alter table challenges
  add column if not exists title_widget_layout text not null default 'row'
    check (title_widget_layout in ('row', 'stacked', 'minimal'));
