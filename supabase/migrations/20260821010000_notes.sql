-- Notes: a standalone notebook, organized by "note type" (a `fields` row
-- with type='note') and optionally a folder. NOT checklist_records, despite
-- the client historically storing them that way with checklist_id/
-- checklist_template_id set to '' — that only worked because it never
-- synced anywhere. checklist_records' FKs (and the submissions row every
-- record now requires) assume a real checklist, which a note never has.
-- See CLAUDE.md.

-- ─── note_folders ───────────────────────────────────────────────────────
create table if not exists note_folders (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table note_folders enable row level security;

create policy "Users can manage their own note folders"
  on note_folders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_note_folders_user_id on note_folders (user_id);

-- ─── notes ──────────────────────────────────────────────────────────────
-- `field_id` is not a foreign key into `fields`, same reasoning as
-- checklist_records.field_id — a note can legitimately arrive before its
-- field does if two writes race after coming back online.
--
-- `folder_id` IS a real foreign key (unlike its checklist_records
-- ancestor, which had nothing to point at): deleting a folder clears the
-- note's folder rather than deleting the note — a folder is organization,
-- not ownership.
create table if not exists notes (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  field_id text not null,
  folder_id text references note_folders (id) on delete set null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;

create policy "Users can manage their own notes"
  on notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_notes_user_field_created on notes (user_id, field_id, created_at);
create index if not exists idx_notes_user_folder on notes (user_id, folder_id);
