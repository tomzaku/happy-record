-- Whether a schedule is meant as an ongoing weekly pattern vs. a one-time arrangement bounded by
-- started_at/until (e.g. "Mon-Sun this week only") — a separate question from whether it *will*
-- stop repeating (that's until/count already, unaffected by this). Metadata for schedule-summary
-- text and an isRecurring check (see scheduleUtils.ts) — occurrence matching (occursOnDate) still
-- reads byday/until/count exactly as before, regardless of this column.
--
-- Defaults true: every schedule created before this column existed was an open-ended weekly
-- pattern with no way to mark otherwise.
alter table schedules add column if not exists recurring boolean not null default true;
