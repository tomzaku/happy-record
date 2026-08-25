-- The visual theme the owner picks for the shared "take the challenge" page
-- (checklist-template-shared-page-ui) — a fixed set of 3, not free text, so
-- the client can ship one stylesheet per value instead of validating
-- arbitrary owner input into CSS. Owner-only to set, same as every other
-- CardShare option — covered by `challenges`' existing owner-only RLS
-- policy, since it's just another column on that same row (no new policy
-- needed, unlike field_targets, which needed peer-read grants theme
-- doesn't: theme is already visible to anyone who can already read the
-- challenge row at all, via the existing "challenges are readable when
-- their template is" policy).
alter table challenges
  add column if not exists theme text not null default 'classic'
    check (theme in ('classic', 'ignite', 'playful'));
