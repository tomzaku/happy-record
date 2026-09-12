-- Per-day completion marker for a field group with no fields of its own to submit against — the
-- same "plain check/uncheck, no fields involved" idea `checklists.completed_at` already covers
-- for a whole fieldless template, scoped one level down to a single sub-task within a template
-- that otherwise has other (real, field-bearing) sub-tasks too. `field_groups` itself has no day
-- dimension (one row per sub-task, not one per sub-task per day — see
-- 20260829010000_notes_note_id_ownership.sql's own comment on that table), so "done today" can't
-- live there; `checklists` already is that one-row-per-template-per-day instance, so a completion
-- hangs off `checklist_id` the same way `checklist_records` does.
--
-- New table, no `create policy` — see CLAUDE.md's "Authorization: app layer, not RLS".
create table if not exists field_group_completions (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  checklist_id text not null references checklists (id) on delete cascade,
  -- Not a real FK — same client-generated-id tolerance `field_groups.checklist_template_id`
  -- already has: every query here is also scoped by user_id, so this can't leak across owners.
  field_group_id text not null,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, field_group_id, user_id)
);

alter table field_group_completions enable row level security;

create index if not exists idx_field_group_completions_user_checklist
  on field_group_completions (user_id, checklist_id);
