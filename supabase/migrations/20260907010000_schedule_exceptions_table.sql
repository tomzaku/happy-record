-- A single-occurrence override on top of an otherwise-recurring `schedules` row — "skip this one
-- holiday" (or "move this one occurrence to a different time") without touching the recurrence
-- rule itself. Kept as its own table rather than a column on `schedules` (e.g. a jsonb array of
-- excluded dates) because an exception isn't just a date: it has its own `type`, and a
-- `MODIFIED`-type exception (move this one occurrence to a different time, not just delete it)
-- needs its own override data, which a single jsonb blob on the parent row would make awkward to
-- query/index one exception at a time. Past tense on purpose (`DELETED`/`MODIFIED`, not
-- `DELETE`/`UPDATE`) — a row here records what already happened to that one occurrence, it isn't a
-- command to run.
--
-- `occurrence_started_at` is a full `timestamptz` instant, not a plain `date` — a `date`-only key
-- only identifies the right occurrence while a schedule can produce at most one per calendar day,
-- which happens to be every schedule this app builds today (`byday`/single `byhour`/`byminute`,
-- see rruleUtils.ts's own comment on `freq` always being `WEEKLY`) but isn't a real invariant this
-- table should bake in — a schedule that ever recurs more than once a day would have every one of
-- that day's occurrences collide on the same `date` key, so deleting/modifying one would silently
-- hit (or even second-guess "one per day" and refuse to write) whichever occurrence happened to be
-- there first. A full instant is unambiguous regardless of how many times a day a schedule
-- recurs. `timezone` rides alongside it (mirroring `schedules.timezone`) so a caller reading this
-- back can recover the *local* calendar day this occurrence actually fell on
-- (`supabase/shared/rruleUtils.ts`'s own `calendarDayIn`) — a bare UTC read of the instant can
-- land on the wrong local day near a midnight boundary, same reasoning `schedules.timezone`
-- itself already exists for.
--
-- `override_started_at` is a real typed column, not a jsonb blob — this app avoids jsonb wherever
-- the shape is actually known (see CLAUDE.md's DB conventions). One `timestamptz`, not a separate
-- date/hour/minute split — `schedules.started_at` already represents "this occurrence's own moment"
-- the same way (a single timestamp, not day+hour+minute columns), and a moved occurrence is exactly
-- that same concept for one specific occurrence, so it should look like it. Only a `MODIFIED` row
-- ever needs it, and the CHECK below enforces that split at write time rather than leaving it to
-- app code to keep straight.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
create table if not exists schedule_exceptions (
  -- Deterministic, not freshly generated: one exception per (schedule, occurrence) is the whole
  -- point of this table (you can't "skip a holiday" twice), so the id itself is the uniqueness
  -- constraint, same reasoning `schedules.id` already uses for its own (owner, user) pair.
  id text primary key,
  schedule_id text not null references schedules (id) on delete cascade,
  -- Denormalized off `schedules.user_id` — every other table here scopes its own-row RLS policy
  -- (inert per CLAUDE.md's "Authorization: app layer, not RLS", but kept for consistency) off a
  -- real user_id column rather than a join, and a future "my upcoming exceptions" query wants the
  -- same shortcut.
  user_id uuid not null references auth.users on delete cascade,
  -- The occurrence being excepted, as the schedule's own recurrence rule would naturally have
  -- generated it — never the *new* moment for a `MODIFIED` row (that's `override_started_at`
  -- below). See this migration's own header comment on why this is a full instant, not a `date`.
  occurrence_started_at timestamptz not null,
  timezone text,
  type text not null check (type in ('DELETED', 'MODIFIED')),
  override_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_exceptions_one_per_occurrence unique (schedule_id, occurrence_started_at),
  constraint schedule_exceptions_type_shape check (
    (type = 'DELETED' and override_started_at is null)
    or
    (type = 'MODIFIED' and override_started_at is not null)
  )
);

-- Enabled, no matching policy — see CLAUDE.md's "Authorization: app layer, not RLS": a new
-- table's own migration doesn't get a `create policy` any more, just this fail-safe. Real
-- enforcement is schedule-exceptions-service.ts deriving every write's `schedule_id` from
-- `ctx.userId`, never trusting one from the client.
alter table schedule_exceptions enable row level security;

create index if not exists idx_schedule_exceptions_schedule_id on schedule_exceptions (schedule_id);
