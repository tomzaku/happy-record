-- Replaces the hand-rolled day_of_month/month/day_of_week cron-like fields with structured
-- columns named after the `rrule` library's own standard options (freq/interval/byday/byhour/
-- byminute/count/until) — real recurrence generation (INTERVAL, COUNT, UNTIL) instead of a
-- manual weekday-set check. `started_at` (DTSTART) and `timezone` (TZID) are untouched — those
-- are already their own real concepts, not duplicated logic.
--
-- `rrule` is a DEBUG-ONLY column: regenerated from the structured columns on every write
-- (fromRepeat in supabase/shared/repeats.ts), so a row is human-checkable at a glance in the DB
-- (Supabase studio / psql) instead of cross-referencing six separate columns. No app code —
-- client or server — ever reads it back; it is not the source of truth.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
alter table repeats add column if not exists freq text
  check (freq is null or freq in ('YEARLY','MONTHLY','WEEKLY','DAILY','HOURLY','MINUTELY','SECONDLY'));
alter table repeats add column if not exists interval int;
alter table repeats add column if not exists byday text;
alter table repeats add column if not exists byhour int;
alter table repeats add column if not exists byminute int;
alter table repeats add column if not exists count int;
alter table repeats add column if not exists until timestamptz;
alter table repeats add column if not exists rrule text;

alter table repeats drop column if exists hour;
alter table repeats drop column if exists minute;
alter table repeats drop column if exists day_of_month;
alter table repeats drop column if exists month;
alter table repeats drop column if exists day_of_week;
alter table repeats drop column if exists ended_at;

-- Same "notification sweep" access pattern idx_repeats_hour_minute existed for, renamed onto the
-- columns that replace hour/minute.
drop index if exists idx_repeats_hour_minute;
create index if not exists idx_repeats_byhour_byminute on repeats (byhour, byminute);
