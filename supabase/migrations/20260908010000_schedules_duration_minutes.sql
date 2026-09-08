-- How long each occurrence of a scheduled task actually runs, alongside its own start time
-- (byhour/byminute) — "clean the house, 8am-10am every weekday" is byhour=8/byminute=0/
-- duration_minutes=120. A plain minute count, not a generic multi-unit duration column: minutes
-- have no month/year-length ambiguity the way a calendar-relative unit would (see
-- `checklists_duration_days`'s own comment on why that matters) — a multi-day occurrence (say,
-- 09/08 05:00 -> 09/11 08:00, 4500 minutes) is exactly as representable as a same-day one, no
-- special-casing needed. This column only ever answers "how long does one occurrence last," never
-- "when does the whole recurring series stop" — that's still `until`/`count` (already real columns
-- on this table). It's also display-only today: `occursOnDate` (rruleUtils.ts) still only checks
-- whether an occurrence *starts* on a given calendar day, not whether a still-running multi-day
-- occurrence should keep the schedule "active" through the days after that — see
-- rruleUtils.test.ts's own coverage of that gap. Nullable: no value means no defined duration set
-- yet, same absence convention as every other optional column here.
alter table schedules add column if not exists duration_minutes integer
  check (duration_minutes is null or duration_minutes > 0);
