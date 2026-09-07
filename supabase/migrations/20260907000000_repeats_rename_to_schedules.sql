-- Renames `repeats` to `schedules` — "repeat" named the recurrence rule specifically; "schedule"
-- is the broader concept this table anchors now that it's about to gain a second kind of row
-- (schedule_exceptions, see the next migration) that isn't a recurrence rule at all, just a single
-- date's own override. Contents/columns are unchanged, only the name — see supabase/shared/schedules.ts
-- (renamed from repeats.ts) for the row-mapping/query side of this.
alter table repeats rename to schedules;
alter table schedules rename constraint repeats_owner_shape to schedules_owner_shape;

alter index idx_repeats_checklist_template_user rename to idx_schedules_checklist_template_user;
alter index idx_repeats_field_group_user rename to idx_schedules_field_group_user;
alter index idx_repeats_byhour_byminute rename to idx_schedules_byhour_byminute;

alter policy "Users can manage their own repeats" on schedules
  rename to "Users can manage their own schedules";
