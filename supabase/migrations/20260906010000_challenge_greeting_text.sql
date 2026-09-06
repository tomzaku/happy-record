-- Owner-customizable invitation headline for the shared "take the challenge" page
-- (checklist-template-shared-page-ui) — replaces the auto-generated "X just challenged Y!"
-- sentence when set. Plain free text rendered as JSX text content (React escapes it — see
-- ChecklistTemplateSharedPage's own greeting line), not concatenated into HTML/CSS, so there's no
-- injection surface beyond length; capped the same way every other free-text column here is
-- (background_image_url — 20260828000000_challenge_background_image.sql).
alter table challenges
  add column if not exists greeting_text text
    check (
      greeting_text is null
      or char_length(greeting_text) <= 200
    );
