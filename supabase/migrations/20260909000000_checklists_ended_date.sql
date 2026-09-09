-- Replaces `duration_days` (a relative day count) with `ended_date` — an absolute last day for a
-- one-off task's own Checklist row, sent by the client as `endedDate`. `duration_days` avoided
-- colliding with `repeats.until` (see `checklists_duration_days`'s own comment on why an absolute
-- date used to be risky there), but that collision was really about ScheduleEditDialogs' own
-- staged fields silently reseeding from whichever field happened to hold "end date" — and those
-- fields (`tempEndDay`/`tempStartDay`) only ever seed from `checklistTemplate.repeat`, never from
-- a `checklists` row, so an absolute date living here doesn't reintroduce that. An absolute date
-- is what detail-task-page actually wants to display (ChecklistGenericInfo's Schedule row), rather
-- than recomputing `startedAt + days`. Nullable: no value means no defined end (the "No end date"
-- case), never a magic sentinel.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
alter table checklists add column if not exists ended_date timestamptz
  check (ended_date is null or ended_date >= started_at);

alter table checklists drop column if exists duration_days;
