-- Duplicate `checklists` rows: a scheduled template's "not found, create
-- today's instance" path (packages/global/src/store/checklists/useChecklists.tsx
-- computeChecklistsForDate, and detail-task-page's own "create if no
-- checklistId yet" effect) used to mint a fresh v4() id every time it ran —
-- and it can run more than once for the exact same (user, template, day)
-- before the fetch that would have found the real row lands: a checkbox
-- click racing that day's own GET, or detail-task-page's effect re-running
-- before its own `setSearchParams` commits. Every such race inserted a
-- brand-new row instead of updating the existing one, so one real "Yoga"
-- checkbox ended up as 50+ separate rows for the same day, most still
-- uncompleted — see CLAUDE.md's `fields.id` note for the same class of bug.
--
-- The client now derives the id deterministically from (checklistTemplateId,
-- day) instead (checklistInstanceId), so racing attempts converge on one
-- row going forward. This migration is the belt-and-suspenders half: collapse
-- any duplicates already created, and add a constraint so an exact repeat of
-- this race can never insert a second row again, even from a client that
-- hasn't picked up the id-derivation fix yet.
--
-- Scoped to `started_at` exactly, not a truncated calendar day: everything
-- observed shared one literal timestamp (traced to the still-mounted
-- `startDate` a repeated click keeps reusing) — an exact match has no
-- timezone-boundary edge case to worry about, unlike a UTC-truncated day
-- would for a user far from UTC.

-- Keep one row per (user, template, started_at) — prefer a completed one
-- (the user's evident intent) over a completed_at IS NULL leftover, and the
-- most recently updated among ties.
delete from checklists c
using (
  select id,
    row_number() over (
      partition by user_id, checklist_template_id, started_at
      order by (completed_at is not null) desc, updated_at desc
    ) as rn
  from checklists
) ranked
where c.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists idx_checklists_user_template_started_unique
  on checklists (user_id, checklist_template_id, started_at);
