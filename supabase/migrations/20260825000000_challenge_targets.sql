-- Targets: a shared, collective goal per metric field on a challenge (e.g.
-- "100 push-ups" for the whole group to reach together) plus a per-person
-- contribution breakdown. Owner-only to set, "before or after share" (the
-- same CardShare row that already owns the two challenge checkboxes) —
-- covered by `challenges`' existing owner-only RLS policy, since it's just
-- another column on that same row. Text fields are out of scope on purpose:
-- there's no sensible numeric goal for one, and the existing streak grid /
-- ranking (completions-in-range) already covers "did they contribute" for
-- those — see CLAUDE.md.
--
-- `field_targets` keys are the field id *as referenced by the challenge's
-- own (the owner's) template* — never a participant's forked copy (see
-- 20260824010000_field_defaults_and_forking.sql: joining forks the
-- template's fields into the joiner's own owned rows, so a participant's
-- checklist_records.field_id is their own fork's id, not the original).
-- Resolving a participant's contribution back to the original targeted
-- field has to go through their fork's own `copied_from_id`.
alter table challenges
  add column if not exists field_targets jsonb not null default '{}';

-- ─── peer read for target resolution + contribution, not other fields ───
-- Two new grants, both scoped tightly to "a field this challenge actually
-- targets," not "everything a fellow participant owns":
--
--   1. `fields` — a participant's own forked field is private by default
--      (see useJoinChallenge.tsx: "visibility intentionally omitted ->
--      defaults private"), so without this, nobody but that participant
--      could even discover which of their fields corresponds to a targeted
--      one. Scoped to forks whose `copied_from_id` is literally one of the
--      challenge's targeted keys — an untargeted field (a personal note, a
--      metric with no goal set) stays exactly as invisible to peers as
--      before this migration.
--   2. `checklist_records` — the actual numbers. Same targeted-field scope,
--      covering both the owner's own rows (field_id itself is a target key)
--      and a participant's rows (field_id resolves to a target key via
--      their fork's copied_from_id). `checklist_records` still has no
--      blanket peer-read policy — only rows whose field is a live target
--      become visible, and only `value_number`/`field_id`/`user_id` are
--      ever actually selected for this (see challenges/index.ts's
--      getDashboard) even though RLS itself is row- not column-scoped;
--      `value_text` never has a reason to be read here since only metric
--      fields can be targeted.
--
-- Both general-purpose endpoints (`GET /fields`, `GET /checklist-records`)
-- stay safe regardless: each already hard-scopes its own query to the
-- caller's own rows (see their `list()` — CLAUDE.md's "defense in depth"),
-- so this broader RLS grant is only ever exercised by challenges'
-- own dashboard read, which controls exactly what it returns to the client.
create policy "Challenge participants can resolve peers' targeted field forks"
  on fields for select
  using (
    exists (
      select 1
      from challenge_participants me
      join challenges c on c.id = me.challenge_id
      where me.user_id = auth.uid()
        and c.share_records = true
        and c.field_targets ? fields.copied_from_id
        and exists (
          select 1 from challenge_participants owner_row
          where owner_row.challenge_id = c.id and owner_row.user_id = fields.user_id
        )
    )
  );

create policy "Challenge participants can see peers' targeted contributions"
  on checklist_records for select
  using (
    exists (
      select 1
      from challenge_participants me
      join challenges c on c.id = me.challenge_id
      join challenge_participants owner_row
        on owner_row.challenge_id = c.id and owner_row.user_id = checklist_records.user_id
      left join fields f on f.id = checklist_records.field_id
      where me.user_id = auth.uid()
        and c.share_records = true
        and (c.field_targets ? checklist_records.field_id or c.field_targets ? f.copied_from_id)
    )
  );
