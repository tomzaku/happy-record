-- Tags: the registry of tag names behind the home page's Filter by Tag
-- dropdown and TagInput's autocomplete/create UI — distinct from
-- checklist_templates.tags, the free-text text[] actually attached to a
-- template. Same owner-only shape as flags (id, name, timestamps), but no
-- relation the way flag_id is a real foreign key — a template's `tags`
-- array stores names, not registry ids. See CLAUDE.md.

create table if not exists tags (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tags enable row level security;

create policy "Users can manage their own tags"
  on tags for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_tags_user_id on tags (user_id);
