import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Card from '@moon-ui/card';
import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import EmptyChecklistIllustration from './EmptyChecklistIllustration';
import ChecklistDayHeader from './ChecklistDayHeader';
import ChecklistDayMobileRow from './ChecklistDayMobileRow';
import SectionExpandButton from './SectionExpandButton';
import AddInlineTask, { PendingInlineTask } from '../AddInlineTask';
import { useFieldGroupExpansion } from './useFieldGroupExpansion';
import { getLunarDate } from '../../utils/lunarDate';

// An optimistic placeholder for a task still saving — see AddInlineTask's own comment on why a
// creating task's real Checklist row can't appear until its template's own POST resolves. Mirrors
// PendingTaskRow's own look, in mobile's own row classes (index.module.scss) rather than
// desktop's ChecklistDay.desktop.module.scss ones that component reads from.
const PendingTaskRow = ({ task }: { task: PendingInlineTask }) => {
  const intl = useIntl();
  return (
    <div className={styles.taskRowContainer}>
      <div className={styles.checklistItem}>
        <div className={styles.rowCheckbox}>
          <Icon width={20} icon="svg-spinners:180-ring" />
        </div>
        <div className={styles.titleRow}>
          <Typography.Text className={styles.title}>{task.title}</Typography.Text>
          <Typography.Text className={styles.rowSubtitle}>
            {intl.formatMessage({ id: 'ChecklistToday.creating', defaultMessage: 'Creating…' })}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

// The mobile Today list — a header (date/lunar/progress, shared with desktop's own
// ChecklistDayHeader) plus a flat Pending/Completed row list. Task creation has two entry
// points, same as desktop: this file's own inline AddInlineTask bar above Pending, and
// index.mobile.tsx's persistent floating "+" button/bottom sheet for whichever other tab
// (Calendar/Recent) is showing instead of this list.
const ChecklistDay = ({
  date,
  selectedTag,
  onGoToToday,
}: {
  date: Date;
  selectedTag?: string;
  onGoToToday?: () => void;
}) => {
  const { getChecklistByGivingDate, updateChecklist, checklistsLoading } = useChecklist();
  const { checklistTemplate, templatesLoading } = useChecklistTemplates();
  const navigate = useNavigate();
  const intl = useIntl();

  const { checklist, checklistIds: checklistByGivingDateIds } = React.useMemo(
    () => getChecklistByGivingDate({ date, selectedTag }),
    [getChecklistByGivingDate, date, selectedTag],
  );

  const lunar = React.useMemo(() => getLunarDate(date), [date]);

  const pendingIds = checklistByGivingDateIds.filter(id => !checklist[id]?.completedAt);
  const completedIds = checklistByGivingDateIds.filter(id => checklist[id]?.completedAt);
  const completedPercent =
    checklistByGivingDateIds.length > 0 ? Math.round((completedIds.length / checklistByGivingDateIds.length) * 100) : 0;

  const {
    collapsedFieldGroupIds,
    toggleFieldGroupExpanded,
    pendingExpandableIds,
    completedExpandableIds,
    isSectionExpanded,
    toggleSectionExpanded,
  } = useFieldGroupExpansion({
    checklist,
    checklistTemplate,
    date,
    pendingIds,
    completedIds,
  });

  const header = (
    <ChecklistDayHeader
      date={date}
      lunar={lunar}
      completedCount={completedIds.length}
      pendingCount={pendingIds.length}
      completedPercent={completedPercent}
      onGoToToday={onGoToToday}
    />
  );

  const handleNavigate = (checklistTemplateId: string, checklistId: string, clientOnly?: boolean) => {
    const baseUrl = `/task/${checklistTemplateId}?currentDay=${date.toISOString()}`;
    navigate(baseUrl + (clientOnly ? '' : `&checklistId=${checklistId}`));
  };

  // Optimistic placeholders for tasks that are still saving — see AddInlineTask's own comment.
  const [pendingTasks, setPendingTasks] = React.useState<PendingInlineTask[]>([]);
  const handleTaskCreateStart = React.useCallback((task: PendingInlineTask) => {
    setPendingTasks(prev => [...prev, task]);
  }, []);
  const handleTaskCreateEnd = React.useCallback((id: string) => {
    setPendingTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const addTask = (
    <AddInlineTask
      date={date}
      className={styles.quickAddTask}
      onTaskCreateStart={handleTaskCreateStart}
      onTaskCreateEnd={handleTaskCreateEnd}
    />
  );

  if ((templatesLoading || checklistsLoading) && checklistByGivingDateIds.length === 0) {
    return (
      <>
        {header}
        <div className={styles.emptyContainer}>
          <Icon width={40} icon="svg-spinners:180-ring" className={styles.iconEmpty} />
          <Typography.Text>
            {intl.formatMessage({ id: 'ChecklistToday.loading', defaultMessage: 'Fetching your tasks…' })}
          </Typography.Text>
        </div>
      </>
    );
  }

  if (checklistByGivingDateIds.length === 0 && pendingTasks.length === 0) {
    return (
      <>
        {header}
        <div className={styles.emptyContainer}>
          <EmptyChecklistIllustration />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({ id: 'ChecklistToday.no-record', defaultMessage: 'No tasks found!' })}
          </Typography.Title>
        </div>
        {addTask}
      </>
    );
  }

  return (
    <div className={styles.container}>
      {header}
      {addTask}

      {(pendingIds.length > 0 || pendingTasks.length > 0) && (
        <>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <Icon width={20} icon="material-symbols:checklist" className={styles.sectionIcon} />
              <Typography.Text className={styles.sectionLabel}>
                {intl.formatMessage({ id: 'ChecklistToday.pending', defaultMessage: 'Pending' })}
              </Typography.Text>
              <Typography.Text className={styles.sectionCount}>
                {pendingIds.length + pendingTasks.length}
              </Typography.Text>
            </div>
            <SectionExpandButton
              expandableIds={pendingExpandableIds}
              isSectionExpanded={isSectionExpanded}
              onToggleSectionExpanded={toggleSectionExpanded}
              styles={styles}
            />
          </div>
          <Card className={styles.rowsCard}>
            {pendingIds.map(id => (
              <ChecklistDayMobileRow
                key={id}
                id={id}
                date={date}
                checklist={checklist}
                checklistTemplate={checklistTemplate}
                updateChecklist={updateChecklist}
                onNavigate={handleNavigate}
                expanded={!collapsedFieldGroupIds.has(id)}
                onToggleExpanded={() => toggleFieldGroupExpanded(id)}
              />
            ))}
            {pendingTasks.map(task => (
              <PendingTaskRow key={task.id} task={task} />
            ))}
          </Card>
        </>
      )}

      {completedIds.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <Icon width={20} icon="material-symbols:task-alt" className={styles.sectionIcon} />
              <Typography.Text className={styles.sectionLabel}>
                {intl.formatMessage({ id: 'ChecklistToday.completed', defaultMessage: 'Completed' })}
              </Typography.Text>
              <Typography.Text className={styles.sectionCount}>{completedIds.length}</Typography.Text>
            </div>
            <SectionExpandButton
              expandableIds={completedExpandableIds}
              isSectionExpanded={isSectionExpanded}
              onToggleSectionExpanded={toggleSectionExpanded}
              styles={styles}
            />
          </div>
          <Card className={styles.rowsCard}>
            {completedIds.map(id => (
              <ChecklistDayMobileRow
                key={id}
                id={id}
                date={date}
                checklist={checklist}
                checklistTemplate={checklistTemplate}
                updateChecklist={updateChecklist}
                onNavigate={handleNavigate}
                expanded={!collapsedFieldGroupIds.has(id)}
                onToggleExpanded={() => toggleFieldGroupExpanded(id)}
              />
            ))}
          </Card>
        </>
      )}
    </div>
  );
};

export default ChecklistDay;
