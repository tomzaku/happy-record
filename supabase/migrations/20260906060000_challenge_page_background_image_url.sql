-- Whole-page background photo — distinct from `background_image_url` (a small decorative corner
-- accent behind the card, see 20260828000000_challenge_background_image.sql): this one covers
-- the entire shared page (`.page`, both desktop and mobile), behind the card/hero regardless of
-- whether it renders 'solid' or 'glass' (20260906050000_challenge_page_background_layout.sql) —
-- most visible through a 'glass' panel, but not exclusive to it. Same validation shape as
-- background_image_url: a plain http(s) URL, capped length.
alter table challenges
  add column if not exists page_background_image_url text
    check (
      page_background_image_url is null
      or (char_length(page_background_image_url) <= 2000 and page_background_image_url ~ '^https?://')
    );
