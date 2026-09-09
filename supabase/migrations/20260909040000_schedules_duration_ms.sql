-- Replaces `duration_minutes` with `duration` — one occurrence's own length, in milliseconds
-- rather than minutes. Milliseconds because that's what the client already has on hand the
-- moment a duration is actually set: `ScheduleEditDialogs.tsx`'s own Start/End Date fields are
-- both real `Date`s, and `End.getTime() - Start.getTime()` is milliseconds already — minutes
-- meant converting on every write and every read for no real benefit (nothing about a task's own
-- duration needs minute-only precision).
--
-- `bigint`, not `integer`: milliseconds eats through `integer`'s ~2.1 billion range far faster
-- than minutes did (int4 ms tops out around 24.8 days, vs. minutes' own ~4085 years) — a
-- multi-day occurrence (the same 09/08 05:00 -> 09/11 08:00 example `duration_minutes`'s own
-- migration used) is still nowhere near that, but there's no reason to inherit a tighter ceiling
-- than the old column had just by switching units. Nullable: no value means no defined duration
-- set yet, same absence convention as every other optional column here.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
alter table schedules add column if not exists duration bigint
  check (duration is null or duration > 0);

alter table schedules drop column if exists duration_minutes;
