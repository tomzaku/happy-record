-- Owner-set background photo for the shared "take the challenge" page
-- (checklist-template-shared-page-ui) — a plain URL, not an upload. This
-- app has no file-storage/upload pipeline anywhere (see CLAUDE.md's
-- "online-first" tradeoff — writes are optimistic REST, nothing handles
-- binary blobs), so the owner just points at a photo already hosted
-- somewhere else, same as any other external image src.
--
-- Free text is safe here despite `theme` (20260825010000_challenge_theme.sql)
-- being a fixed enum specifically to avoid validating arbitrary input into
-- CSS: this value is only ever set as an inline style *property*
-- (backgroundImage, via the DOM API — see theme.ts's
-- useApplyChallengeTheme) rather than concatenated into a CSS/HTML string,
-- so there's no injection surface beyond "is this even a URL," which the
-- CHECK below covers the same way every other caller-supplied value in
-- this app is clamped server-side.
alter table challenges
  add column if not exists background_image_url text
    check (
      background_image_url is null
      or (char_length(background_image_url) <= 2000 and background_image_url ~ '^https?://')
    );
