-- How opaque the 'glass' page background layout's panel is (0 = fully transparent, 100 = fully
-- opaque white) — see 20260906050000_challenge_page_background_layout.sql. Only meaningful when
-- page_background_layout is 'glass', but stored unconditionally like every other widget option
-- here, so switching back and forth doesn't lose the owner's last chosen value.
alter table challenges
  add column if not exists glass_opacity integer not null default 12
    check (glass_opacity >= 0 and glass_opacity <= 100);
