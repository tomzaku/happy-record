-- Replaces the one-target-per-field model (field_targets: {[fieldId]: number}) with an
-- owner-defined formula per target: { id, title, unit, icon, goal, formula, variables }, where
-- `variables` maps a mathjs identifier to a field id and `formula` is a mathjs expression
-- evaluated against those fields' values *within one submission* (see
-- challenges-service.ts's getTargets) — a plain "sum of one field" is just the one-variable case,
-- so this single shape replaces field_targets rather than living alongside it. No data migration:
-- this feature is ~2 weeks old with no real usage to preserve (see 20260825000000_challenge_targets.sql).
alter table challenges
  add column if not exists targets jsonb not null default '[]';

alter table challenges drop column if exists field_targets;

-- Both policies read `challenges.field_targets`, now dropped, and are inert leftovers anyway —
-- peer-visibility for target contributions is enforced in getTargets via `visibleUserIds`, not
-- RLS (see CLAUDE.md's "Authorization: app layer, not RLS").
drop policy if exists "Challenge participants can resolve peers' targeted field forks" on fields;
drop policy if exists "Challenge participants can see peers' targeted contributions" on checklist_records;
