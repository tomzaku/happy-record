-- Lineage for a series split (Google Calendar's "edit this and following events"): the original
-- template gets its own `repeat.until` capped to the day before the split point, and a brand new
-- template is created starting from that date with the new schedule — see
-- packages/global/src/store/checklists/useChecklistTemplateMutations.ts's `splitChecklistTemplate`.
-- This column is display/lineage only, nothing occurrence-matching reads it.
--
-- A second row for the *same* `schedules` owner (a literal split of one schedule into multiple
-- date-bounded segments) isn't possible without reworking `schedules.id`'s own deterministic
-- (owner, user) uniqueness — see that table's own migration — so a split is modeled as two
-- independent templates instead, each with the one schedule row it already always had. Nullable:
-- most templates were never split. `on delete set null`, not `cascade` — a split-off template is
-- its own real series once created; it shouldn't disappear just because whatever it originally
-- continued from later gets deleted.
alter table checklist_templates add column if not exists split_from_id text
  references checklist_templates (id) on delete set null;
