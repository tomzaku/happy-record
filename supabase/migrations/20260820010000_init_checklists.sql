-- The checklist/record system behind `/task/:id` (DetailTaskPage) — the
-- daily habit tracker: a template repeats on a schedule, each day gets a
-- Checklist instance, and "Submit" writes ChecklistRecords against it.
--
-- Deliberately NOT a 1:1 mirror of the localStorage shapes (see CLAUDE.md —
-- the schema is allowed to differ from the client's). Two changes matter for
-- query performance, both aimed at history/chart reads:
--
--   1. `checklist_records.value` is split into `value_number` / `value_text`
--      instead of one jsonb column, so a chart summing a metric field is a
--      real indexed numeric aggregate, not `(value->>'x')::numeric` on every
--      row.
--   2. `checklist_records.checklist_template_id` is denormalized onto the
--      record (not just reachable via a join through `checklists`), because
--      every history/chart read in the app queries "this template's records
--      in this date range" directly — see RecordDayView, ChecklistFieldGroupHistory,
--      useMetricRecordField.

-- ─── fields ─────────────────────────────────────────────────────────────
-- Field definitions a user tracks (duration, push-ups, a note...). Global
-- defaults are seeded client-side (packages/global/src/store/record-field,
-- still called RecordField/useRecordField there — only the table and the
-- edge function are named `fields`); nothing server-side assumes a row
-- exists, so `checklist_records.field_id` below is intentionally not a
-- foreign key into this table.
--
-- `user_id` is nullable: the three defaults every device seeds locally
-- ('duration', 'push-ups', 'note') are fixed ids, identical across every
-- user, by design — they're meant to be one canonical concept, not each
-- user's own copy. A null-owned row is system-seeded (see
-- 20260821000000_seed_system_fields.sql) and unowned by the "manage their
-- own" policy below, so it's read-only to everyone via the public-read
-- policy in fields_visibility.sql — nobody can edit or delete it through
-- the API, only a migration can. Without this, the first user to sync any
-- of the three claims that global id and every other user's edit to
-- "theirs" collides with it.
create table if not exists fields (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  title text not null,
  icon text not null,
  description text not null default '',
  type text not null check (type in ('metric', 'note')),
  unit text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fields enable row level security;

create policy "Users can manage their own fields"
  on fields for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_fields_user_id on fields (user_id);

-- ─── checklist_templates ───────────────────────────────────────────────
-- The recurring definition. `repeat` and `field_groups`/`tags`/`avatar` are
-- UI/schedule config, read whole and never filtered on server-side — jsonb
-- is the right shape for those; only what's genuinely relational
-- (ownership, the public/private read rule) gets a real column.
create table if not exists checklist_templates (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  avatar jsonb not null default '{}'::jsonb,
  repeat_minute text,
  repeat_hour text,
  repeat_day_of_month text,
  repeat_month text,
  repeat_day_of_week text,
  repeat_started_at timestamptz,
  repeat_completed_at timestamptz,
  field_groups jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table checklist_templates enable row level security;

create policy "Users can manage their own checklist templates"
  on checklist_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A public template (the /checklist-template/shared/:id flow) is readable
-- by anyone signed in, not just its owner. This is additive to the policy
-- above, not a replacement — Postgres RLS ORs multiple permissive policies.
create policy "Public checklist templates are readable by anyone"
  on checklist_templates for select
  using (visibility = 'public');

create index if not exists idx_checklist_templates_user_id on checklist_templates (user_id);

-- ─── checklists ─────────────────────────────────────────────────────────
-- One day's instance of a template. A day that's scheduled but has no
-- interaction yet is never written here — the client synthesizes a
-- throwaway ("clientOnly") instance for display and only calls the API once
-- the user actually opens it (see hoc-level sync, not this schema).
create table if not exists checklists (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  checklist_template_id text not null references checklist_templates (id) on delete cascade,
  title text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  -- The "check / uncheck a simple task" case: a day marked done with no
  -- field values at all. Left null until then.
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table checklists enable row level security;

create policy "Users can manage their own checklists"
  on checklists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Every read is "this user's checklists, for one template, in a date range"
-- (the calendar) or "...across all templates, in a date range" (today's
-- list) — both are covered by leading on (user_id, started_at).
create index if not exists idx_checklists_user_started on checklists (user_id, started_at);
create index if not exists idx_checklists_user_template_started
  on checklists (user_id, checklist_template_id, started_at);

-- ─── submissions ────────────────────────────────────────────────────────
-- One Submit click. Every field written in that click shares one row here
-- (see checklist_records.submission_id below) — this is the real "these
-- were committed together" relationship, not a table-free grouping key.
-- No dedicated resource/edge function: nothing reads a submission on its
-- own today, so it's managed as part of `checklist-records`' handlers
-- (created alongside the records it groups, touched when one of them is
-- edited) rather than exposed as its own routes — see CLAUDE.md, "a
-- resource is a thing in the domain, not a table" cuts the other way here
-- too: a table can be real without needing its own resource on top.
create table if not exists submissions (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  checklist_id text not null references checklists (id) on delete cascade,
  checklist_template_id text not null references checklist_templates (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Bumped whenever a record in this submission is edited (the PATCH path
  -- in checklist-records/index.ts), not just when the submission itself
  -- changes shape — a submission has no fields of its own to edit.
  updated_at timestamptz not null default now()
);

alter table submissions enable row level security;

create policy "Users can manage their own submissions"
  on submissions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_submissions_user_template_created
  on submissions (user_id, checklist_template_id, created_at);
create index if not exists idx_submissions_checklist
  on submissions (checklist_id);

-- ─── checklist_records ──────────────────────────────────────────────────
-- What "Submit" writes. The hot path for history and every chart in
-- detail-task-page: RecordDayView, ChecklistFieldGroupHistory,
-- useMetricRecordField all ask "this template's records, this date range,
-- these fields" and then group/sum client-side.
create table if not exists checklist_records (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  checklist_id text not null references checklists (id) on delete cascade,
  checklist_template_id text not null references checklist_templates (id) on delete cascade,
  field_id text not null,
  -- Exactly one of these is set, matching the field's type ('metric' →
  -- value_number, 'note' → value_text). Two typed columns instead of one
  -- jsonb column so summing a metric field is a real numeric aggregate.
  -- The constraint catches a mapping bug (both/neither set) at write time
  -- instead of a chart silently going wrong later.
  value_number double precision,
  value_text text,
  folder_id text,
  -- Every field on one Submit click shares one submission_id (one id per
  -- click, not per field — see CLAUDE.md). That's the real "these were
  -- committed together" relationship; created_at is free to vary per field
  -- and grouping doesn't silently break if it ever does.
  submission_id text not null references submissions (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint checklist_records_value_shape check (num_nonnulls(value_number, value_text) = 1)
);

alter table checklist_records enable row level security;

create policy "Users can manage their own checklist records"
  on checklist_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_checklist_records_user_template_created
  on checklist_records (user_id, checklist_template_id, created_at);
create index if not exists idx_checklist_records_user_field_created
  on checklist_records (user_id, field_id, created_at);
create index if not exists idx_checklist_records_checklist
  on checklist_records (checklist_id);
create index if not exists idx_checklist_records_user_submission
  on checklist_records (user_id, submission_id);
