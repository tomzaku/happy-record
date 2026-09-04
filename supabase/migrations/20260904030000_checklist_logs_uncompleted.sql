-- Unchecking a plain check/uncheck task (completed_at going set->null, the reverse of "marked
-- done") wasn't logged at all — saveChecklist only ever checked for the null->set direction. Adds
-- 'uncompleted' as a fourth `detail` value so that transition gets an entry too.

alter table checklist_logs drop constraint if exists checklist_logs_detail_check;
alter table checklist_logs add constraint checklist_logs_detail_check
  check (detail is null or detail in ('submitted', 'completed', 'uncompleted', 'note_updated'));
