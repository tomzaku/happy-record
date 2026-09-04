-- Symmetric end date for a schedule, alongside `started_at` — lets a recurring task stop
-- generating instances after a given day, the same way `started_at` gates when it begins (see
-- useChecklistTemplates.tsx's getChecklistTemplateIdsByGivingDate). Nullable — "no end date" (the
-- existing default for every row before this) means the schedule repeats indefinitely, unchanged
-- from today's behavior.
alter table repeats add column if not exists ended_at timestamptz;
