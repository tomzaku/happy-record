-- A single calendar-day override on top of an otherwise-recurring `schedules` row — "skip this one
-- holiday" without touching the recurrence rule itself. Kept as its own table rather than a column
-- on `schedules` (e.g. a jsonb array of excluded dates) because an exception isn't just a date: it
-- has its own `type`, and a future `MODIFIED`-type exception (move this one occurrence to a
-- different day/time, not just delete it) needs its own override data, which a single jsonb blob on
-- the parent row would make awkward to query/index one exception at a time. `type` only has real
-- behavior for `DELETED` today (see rruleUtils.ts's future EXDATE wiring) — `MODIFIED` is reserved,
-- same "data model ready before the UI is" convention this app already used for schedules'
-- interval/count columns. Past tense on purpose (`DELETED`/`MODIFIED`, not `DELETE`/`UPDATE`) — a
-- row here records what already happened to that one occurrence, it isn't a command to run.
--
-- `override_started_at` is a real typed column, not a jsonb blob — this app avoids jsonb wherever
-- the shape is actually known (see CLAUDE.md's DB conventions). One `timestamptz`, not a separate
-- date/hour/minute split — `schedules.started_at` already represents "this occurrence's own moment"
-- the same way (a single timestamp, not day+hour+minute columns), and a moved occurrence is exactly
-- that same concept for one specific day, so it should look like it. Only a `MODIFIED` row ever
-- needs it, and the CHECK below enforces that split at write time rather than leaving it to app
-- code to keep straight.
--
-- No dedicated resource/edge function yet either, same as `schedules` itself — nothing outside
-- this table's own owning `schedules` row reads or writes an exception yet.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
create table if not exists schedule_exceptions (
  -- Deterministic, not freshly generated: one exception per (schedule, day) is the whole point of
  -- this table (you can't "skip a holiday" twice), so the id itself is the uniqueness constraint,
  -- same reasoning `schedules.id` already uses for its own (owner, user) pair.
  id text primary key,
  schedule_id text not null references schedules (id) on delete cascade,
  -- Denormalized off `schedules.user_id` — every other table here scopes its own-row RLS policy
  -- (inert per CLAUDE.md's "Authorization: app layer, not RLS", but kept for consistency) off a
  -- real user_id column rather than a join, and a future "my upcoming exceptions" query wants the
  -- same shortcut.
  user_id uuid not null references auth.users on delete cascade,
  exception_date date not null,
  type text not null check (type in ('DELETED', 'MODIFIED')),
  -- Reserved for a future MODIFIED-type exception — the occurrence's own overridden moment (day
  -- and/or time). No caller reads or writes this yet; DELETED is the only type anything produces
  -- today.
  override_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_exceptions_one_per_day unique (schedule_id, exception_date),
  constraint schedule_exceptions_type_shape check (
    (type = 'DELETED' and override_started_at is null)
    or
    (type = 'MODIFIED' and override_started_at is not null)
  )
);

alter table schedule_exceptions enable row level security;

create policy "Users can manage their own schedule exceptions"
  on schedule_exceptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_schedule_exceptions_schedule_id on schedule_exceptions (schedule_id);
