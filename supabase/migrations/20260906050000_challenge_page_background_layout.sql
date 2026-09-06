-- 6th independent layout choice — the shared page's own card/hero background style (the
-- existing solid card + optional corner photo, or a translucent "glass" look letting the theme's
-- own page background show through blurred). Same reasoning and shape as the other widget layout
-- columns (20260906020000_challenge_widget_layouts.sql, etc.): a fixed small set, owner-picked in
-- the invite page's own config drawer, independent of the other layouts.
alter table challenges
  add column if not exists page_background_layout text not null default 'solid'
    check (page_background_layout in ('solid', 'glass'));
