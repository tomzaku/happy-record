-- Flags: a real, user-owned grouping entity for checklist templates — one
-- flag per template (checklist_templates.flag_id), not the many free-text
-- labels `checklist_templates.tags` already is. "Push-ups" and "Pull-ups"
-- both pointing at a "Gym" flag is the motivating case; `tags` stays as-is
-- for anything looser than that. Same shape as note_folders (name,
-- description, timestamps, owner-only) — see CLAUDE.md.

create table if not exists flags (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table flags enable row level security;

create policy "Users can manage their own flags"
  on flags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_flags_user_id on flags (user_id);

-- Nullable, on delete set null: deleting a flag ungroups its templates
-- rather than deleting them — a flag is organization, not ownership, same
-- reasoning as notes.folder_id → note_folders.
alter table checklist_templates
  add column if not exists flag_id text references flags (id) on delete set null;

create index if not exists idx_checklist_templates_user_flag on checklist_templates (user_id, flag_id);
