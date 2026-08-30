-- Pulls every recurrence schedule into one real table. Before this, a schedule lived in two
-- different shapes: `checklist_templates.repeat_*` was already real columns, but
-- `field_groups.repeat` was still one jsonb blob (see 20260829010000_notes_note_id_ownership.sql's
-- own note on why `repeat` stayed jsonb there — "config the server never filters on"). A
-- notification sweep ("everything due at HH:MM right now") needs to scan *every* schedule at
-- once regardless of which kind of row owns it, and a jsonb column can't be indexed the same way
-- a real one can — so both collapse into `repeats`, one row per owner, real columns throughout.
--
-- One row per owner (a checklist_template's own top-level schedule, or one field_group's
-- override), never both on the same row — enforced by the CHECK below, same "exactly one of
-- these is set" shape checklist_records' value_number/value_text CHECK already uses. `id` is
-- derived from the owner (`ct:<checklistTemplateId>` / `fg:<fieldGroupId>`), not a freshly
-- generated one: a repeat is 1:1 with its owner, so a deterministic id makes every write a plain
-- upsert-by-owner instead of needing a lookup-then-insert-or-update round trip, with the prefix
-- keeping the two id spaces from ever colliding on this table's own primary key.
--
-- No backfill — see CLAUDE.md/prior migrations: the database gets reset, not migrated forward.
create table if not exists repeats (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  checklist_template_id text references checklist_templates (id) on delete cascade,
  field_group_id text references field_groups (id) on delete cascade,
  minute text,
  hour text,
  -- Template-only fields (a field group's own schedule is day/time-only — see FieldGroup.repeat,
  -- packages/global/src/store/checklists/useChecklistTemplates.tsx) — left null for a group's row.
  day_of_month text,
  month text,
  day_of_week text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repeats_owner_shape check (num_nonnulls(checklist_template_id, field_group_id) = 1)
);

alter table repeats enable row level security;

create policy "Users can manage their own repeats"
  on repeats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- A public checklist_templates row — or a public template's own field_groups, see
-- 20260829060000_public_template_field_groups.sql — needs its schedule readable by whoever the
-- link is shared with too, not just its owner: without this, a recipient's shared-template view
-- would silently lose every "Mon/Thu at 8am" the moment `repeat` moved off those rows and into
-- this table. Additive to "Users can manage their own repeats" above (RLS ORs permissive
-- policies), read-only to everyone but the owner, same shape as those two policies.
create policy "Repeats of a public checklist template are readable by anyone"
  on repeats for select
  using (
    exists (
      select 1 from checklist_templates ct
      where ct.id = repeats.checklist_template_id and ct.visibility = 'public'
    )
    or exists (
      select 1 from field_groups fg
      join checklist_templates ct on ct.id = fg.checklist_template_id
      where fg.id = repeats.field_group_id and ct.visibility = 'public'
    )
  );

-- 1:1 with each owner — at most one schedule per template, one per group.
create unique index if not exists idx_repeats_checklist_template
  on repeats (checklist_template_id) where checklist_template_id is not null;
create unique index if not exists idx_repeats_field_group
  on repeats (field_group_id) where field_group_id is not null;

-- The notification query's own access pattern: "everything due at this exact minute, right now,"
-- scanned across every user at once — leading on (hour, minute) rather than user_id, unlike every
-- other index in this schema (each of those serves one caller's own scoped read).
create index if not exists idx_repeats_hour_minute on repeats (hour, minute);

-- ─── checklist_templates: repeat_* columns moved into `repeats` ────────
alter table checklist_templates drop column if exists repeat_minute;
alter table checklist_templates drop column if exists repeat_hour;
alter table checklist_templates drop column if exists repeat_day_of_month;
alter table checklist_templates drop column if exists repeat_month;
alter table checklist_templates drop column if exists repeat_day_of_week;
alter table checklist_templates drop column if exists repeat_started_at;
alter table checklist_templates drop column if exists repeat_completed_at;

-- ─── field_groups: repeat jsonb moved into `repeats` ───────────────────
alter table field_groups drop column if exists repeat;
