-- Audit trail for checklist-template ("task") lifecycle events: create/delete on the template
-- itself, plus three update-shaped events surfaced through checklists/checklist-records/notes:
-- a checklist instance's completed_at going null->set ("marked done"), one entry per Submit
-- click, and a field-group's home note being edited. Insert-only, written from server-side
-- service code only (supabase/shared/checklistLogs.ts) — never from a client request directly.
--
-- checklist_template_id/checklist_id are plain text, deliberately NOT real foreign keys, same
-- reasoning as notes.field_id: a real FK with cascade delete would delete a template's own
-- "deleted" log row the instant the template itself is deleted, defeating the point of an audit
-- trail.

create table if not exists checklist_logs (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  checklist_template_id text not null,
  checklist_id text,
  action text not null check (action in ('create', 'update', 'delete')),
  detail text check (detail is null or detail in ('submitted', 'completed', 'note_updated')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table checklist_logs enable row level security;

create policy "Users can manage their own checklist logs"
  on checklist_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_checklist_logs_user_created on checklist_logs (user_id, created_at);
create index if not exists idx_checklist_logs_user_template_created
  on checklist_logs (user_id, checklist_template_id, created_at);
