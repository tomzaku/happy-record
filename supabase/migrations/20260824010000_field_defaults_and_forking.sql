-- Two related additions:
--
--   1. A metric field can carry a default value (`fields.default_value_number`),
--      pre-filled on the daily submit screen. Named with the `_number` suffix
--      (matching checklist_records' value_number/value_text split) so a future
--      text-type default doesn't need a rename.
--
--   2. Joining a challenge now *forks* the template and its fields into the
--      joiner's own owned rows, instead of merging the owner's exact ids into
--      every participant's local store (see useJoinChallenge.tsx). That's what
--      makes "set your own default value" possible at all for a shared field —
--      the three system fields, and anyone else's shared fields, are unowned
--      or owned by someone else, and read-only through the API to everyone
--      but their owner (see CLAUDE.md's "fields" section). `copied_from_id` is
--      lineage only — nothing reads it for access control.
alter table fields
  add column if not exists default_value_number numeric,
  add column if not exists copied_from_id text references fields (id) on delete set null;

alter table checklist_templates
  add column if not exists copied_from_id text references checklist_templates (id) on delete set null;

-- Which template a participant's own checklists are actually recorded
-- against — their own fork after joining, or the owner's own template id
-- for the owner's own auto-enrolled row (see challenges' POST route).
-- Previously unnecessary: every participant referenced the challenge's own
-- checklist_template_id directly, since joining never forked. Backfill
-- existing rows to that same value before making the column required, so a
-- participant who joined before forking existed doesn't lose their spot on
-- the dashboard.
alter table challenge_participants
  add column if not exists checklist_template_id text references checklist_templates (id) on delete cascade;

update challenge_participants
set checklist_template_id = c.checklist_template_id
from challenges c
where c.id = challenge_participants.challenge_id
  and challenge_participants.checklist_template_id is null;

alter table challenge_participants
  alter column checklist_template_id set not null;

-- ─── peer-read policies, re-scoped to each participant's own fork ────────
-- The originals (20260824000000_challenges.sql) compared a checklist's
-- checklist_template_id directly against the challenge's own — correct only
-- because every participant used to reference that exact id. Now each
-- participant's checklists point at their own forked template instead, so
-- the match has to go through challenge_participants.checklist_template_id
-- per participant rather than the challenge's single id.
drop policy if exists "Challenge participants can see peers' checklist completion" on checklists;
create policy "Challenge participants can see peers' checklist completion"
  on checklists for select
  using (
    exists (
      select 1
      from challenge_participants me
      join challenges c on c.id = me.challenge_id
      join challenge_participants target
        on target.challenge_id = c.id
       and target.user_id = checklists.user_id
       and target.checklist_template_id = checklists.checklist_template_id
      where me.user_id = auth.uid()
        and c.share_records = true
    )
  );

drop policy if exists "Challenge participants can see peers' submissions" on submissions;
create policy "Challenge participants can see peers' submissions"
  on submissions for select
  using (
    exists (
      select 1
      from challenge_participants me
      join challenges c on c.id = me.challenge_id
      join challenge_participants target
        on target.challenge_id = c.id
       and target.user_id = submissions.user_id
       and target.checklist_template_id = submissions.checklist_template_id
      where me.user_id = auth.uid()
        and c.share_records = true
    )
  );
