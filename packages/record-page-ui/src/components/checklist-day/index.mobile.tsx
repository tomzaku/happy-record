import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import EmptyChecklistIllustration from './EmptyChecklistIllustration';
import ChecklistDayHeader from './ChecklistDayHeader';
import ChecklistDayMobileRow from './ChecklistDayMobileRow';
import { getLunarDate } from '../../utils/lunarDate';

// The mobile Today list — a header (date/lunar/progress, shared with desktop's own
// ChecklistDayHeader) plus a flat Pending/Completed row list. Task creation lives entirely in
// index.mobile.tsx's own floating "+" button/bottom sheet now, not inline here — see that file's
// own comment on why.
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

  if (checklistByGivingDateIds.length === 0) {
    return (
      <>
        {header}
        <div className={styles.emptyContainer}>
          <EmptyChecklistIllustration />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({ id: 'ChecklistToday.no-record', defaultMessage: 'No tasks found!' })}
          </Typography.Title>
        </div>
      </>
    );
  }

  return (
    <div className={styles.container}>
      {header}

      {pendingIds.length > 0 && (
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <Icon width={20} icon="material-symbols:checklist" className={styles.sectionIcon} />
            <Typography.Text className={styles.sectionLabel}>
              {intl.formatMessage({ id: 'ChecklistToday.pending', defaultMessage: 'Pending' })}
            </Typography.Text>
            <Typography.Text className={styles.sectionCount}>{pendingIds.length}</Typography.Text>
          </div>
        </div>
      )}
      {pendingIds.map((id, index) => (
        <ChecklistDayMobileRow
          key={id}
          id={id}
          isLast={index === pendingIds.length - 1}
          checklist={checklist}
          checklistTemplate={checklistTemplate}
          updateChecklist={updateChecklist}
          onNavigate={handleNavigate}
        />
      ))}

      {completedIds.length > 0 && (
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <Icon width={20} icon="material-symbols:task-alt" className={styles.sectionIcon} />
            <Typography.Text className={styles.sectionLabel}>
              {intl.formatMessage({ id: 'ChecklistToday.completed', defaultMessage: 'Completed' })}
            </Typography.Text>
            <Typography.Text className={styles.sectionCount}>{completedIds.length}</Typography.Text>
          </div>
        </div>
      )}
      {completedIds.map((id, index) => (
        <ChecklistDayMobileRow
          key={id}
          id={id}
          isLast={index === completedIds.length - 1}
          checklist={checklist}
          checklistTemplate={checklistTemplate}
          updateChecklist={updateChecklist}
          onNavigate={handleNavigate}
        />
      ))}
    </div>
  );
};

export default ChecklistDay;
