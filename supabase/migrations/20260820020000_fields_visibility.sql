-- Lets a field be shared, the same public/private pattern
-- checklist_templates already uses. Without this, a public checklist
-- template's field_groups can reference field ids that only exist in the
-- original owner's private fields rows — a recipient opening a shared
-- template would have no way to resolve the field's title/icon/unit at
-- all. See CLAUDE.md.

alter table fields
  add column if not exists visibility text not null default 'private'
    check (visibility in ('public', 'private'));

-- Additive to "Users can manage their own fields" (RLS ORs permissive
-- policies) — a public field stays read-only to everyone but its owner;
-- only the owner's own `for all` policy can ever write it.
create policy "Public fields are readable by anyone"
  on fields for select
  using (visibility = 'public');
