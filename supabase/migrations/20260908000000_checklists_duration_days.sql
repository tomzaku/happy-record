-- Replaces `ended_at` (an absolute end timestamp) with `duration_days` — how many days a one-off
-- task's own arrangement runs for, relative to its own `started_at`. An absolute end date and a
-- "1 day" duration meant the same thing for AddInlineTask's "Single day" choice, but storing an
-- absolute date reused the same "when does this stop" question `repeats.until` already answers
-- for a template's own recurring schedule — and got silently reapplied by ChecklistGenericInfo's
-- Schedule dialog onto a schedule added later (both its dialogs stage into shared state precisely
-- so neither Save clobbers what the other owns — see createTaskUtil.ts's own comment on the exact
-- bug this caused: "single day" capping a brand new weekly pattern to zero occurrences). A small,
-- relative, single-purpose column here has no such collision surface, and stays correct even if
-- `started_at` is ever edited afterward. Nullable: no value means no defined end (the "No end
-- date" case) — never a magic sentinel.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
alter table checklists add column if not exists duration_days integer
  check (duration_days is null or duration_days > 0);

alter table checklists drop column if exists ended_at;
