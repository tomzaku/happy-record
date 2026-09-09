-- Whether a template with field groups uses one combined schedule (ignoring each group's own
-- `repeat`) or each group's own independently — chosen in ChecklistGenericInfo's Schedule modal
-- the first time a template has field groups and hasn't decided yet, switchable afterward. Null
-- (every template before this column existed) keeps today's behavior: derive from field groups
-- whenever any are active — see scheduleUtils.ts's hasGroupSchedule.
alter table checklist_templates
  add column if not exists schedule_mode text
    check (schedule_mode in ('general', 'per_group'));
