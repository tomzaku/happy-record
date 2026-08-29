-- Phase 2 of centralizing notes: flips the relationship direction. Phase 1
-- (20260829000000_centralize_notes.sql) had `notes` point *out* at whatever it belonged to
-- (field_id/checklist_id for a field's value, field_group_id/checklist_template_id for a
-- group's note). Now the owning side holds a `note_id` instead: `fields.note_id` (one current
-- note per field, replacing the per-day journal model for a note-type field's checklist value)
-- and `field_groups.note_id` (the group's own Home note). `notes` goes back to being a plain
-- content table, addressed only by its own id.
--
-- No backfill — see CLAUDE.md/prior conversation: the database gets reset, not migrated forward.

-- ─── notes: back to plain content ──────────────────────────────────────
alter table notes drop constraint if exists notes_field_or_group_chk;
alter table notes drop constraint if exists notes_group_has_template_chk;
drop index if exists idx_notes_user_checklist;
drop index if exists idx_notes_user_field_group;
alter table notes drop column if exists field_id;
alter table notes drop column if exists checklist_id;
alter table notes drop column if exists checklist_template_id;
alter table notes drop column if exists field_group_id;

-- ─── fields: one current note per field ────────────────────────────────
-- Only meaningful for `type = 'note'` rows — same as `unit` only being meaningful for
-- `type = 'metric'` (see 20260820010000_init_checklists.sql) — not enforced by a CHECK, matching
-- that existing precedent.
alter table fields add column if not exists note_id text references notes (id) on delete set null;

-- ─── field_groups: a real table, replacing checklist_templates.field_groups jsonb ──────────────
-- `fields` (the group's own field-ids-plus-overrides list) stays jsonb here even though the
-- table itself isn't — it's read/written whole, never queried by, exactly the "config" case
-- CLAUDE.md says to leave as jsonb; only the identity/note columns below get joined or queried
-- by id, which is what actually justified pulling this out of checklist_templates in the first
-- place.
create table if not exists field_groups (
  id text primary key,
  -- Denormalized, not reachable only via a join through checklist_templates — every list read
  -- here (a template's own groups) queries by (user_id, checklist_template_id) directly, same
  -- reasoning checklist_records.checklist_template_id was denormalized for.
  user_id uuid not null references auth.users on delete cascade,
  -- Not a real FK: client-generated ids, same "arrives before its parent" tolerance the rest of
  -- this schema already has (a write racing a device coming back online, etc) — every query
  -- against it is also scoped by user_id, so this can't leak across owners either way.
  checklist_template_id text not null,
  title text not null,
  note_id text references notes (id) on delete set null,
  fields jsonb not null default '[]'::jsonb,
  default_tab integer,
  active_tabs jsonb,
  collapse_default boolean,
  repeat jsonb,
  -- Explicit ordering — the jsonb array's own position used to be this.
  position integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table field_groups enable row level security;

create policy "Users can manage their own field groups"
  on field_groups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_field_groups_user_template on field_groups (user_id, checklist_template_id);

-- ─── checklist_templates: field_groups moved out ───────────────────────
alter table checklist_templates drop column if exists field_groups;
