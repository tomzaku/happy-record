-- `20260907010000_schedule_exceptions_table.sql` was edited in place to replace `exception_date
-- date` with `occurrence_started_at timestamptz` + `timezone` (see that file's own header comment
-- for why a bare `date` key can't identify one occurrence unambiguously) — correct for a *local*
-- `supabase db reset`, which always replays every migration file from scratch, but a no-op for
-- this project's own remote database: Supabase tracks which migrations already ran by filename/
-- timestamp, not by content, so a remote that had already applied `20260907010000` under its old
-- body just skipped it silently on the next `db push`, leaving the *old* columns live in
-- production (the exact cause of a real 500 — the deployed edge function code writing
-- `occurrence_started_at`/`timezone`, columns that didn't exist yet).
--
-- Only one real row ever existed under the old shape (a single `DELETED` exception from testing,
-- confirmed via `supabase db query --linked` before this migration was written) — dropping and
-- recreating is simpler and safer than an in-place `ALTER TABLE` rename/retype for that little
-- data, and lands remote on exactly the same final shape `20260907010000`'s own (edited) body
-- already describes.
drop table if exists schedule_exceptions;

create table schedule_exceptions (
  id text primary key,
  schedule_id text not null references schedules (id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
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

-- Enabled, no matching policy — a harmless fail-safe (denies-by-default if a JWT-scoped client
-- ever queried this directly by mistake) rather than a real enforcement layer; the actual rule is
-- schedule-exceptions-service.ts deriving every write's `schedule_id` from `ctx.userId`, never
-- trusting one from the client. See CLAUDE.md's "Authorization: app layer, not RLS" — new tables
-- don't get a matching `create policy` at all any more.
alter table schedule_exceptions enable row level security;

create index if not exists idx_schedule_exceptions_schedule_id on schedule_exceptions (schedule_id);
