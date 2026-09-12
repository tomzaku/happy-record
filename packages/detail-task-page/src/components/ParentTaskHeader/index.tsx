import React from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useIntl } from '@dreamer/translation';
import {
  ChecklistTemplate,
  getActiveFieldGroups,
  isFieldGroupActiveOnDay,
  useSyncedSelector,
} from '@dreamer/global';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { formatTemplateSchedule } from '@dreamer/record-page-ui/src/components/checklist-day/checklistDayHelpers';
import { Icon } from '@moon-ui/icon/Icon';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import Skeleton from '@moon-ui/skeleton';
import styles from './index.module.scss';

type Props = {
  checklistTemplate?: ChecklistTemplate;
  isTemplateReady: boolean;
  isOwner: boolean;
  currentDay: string;
  isEditingTitle: boolean;
  editedTitle: string;
  setEditedTitle: (value: string) => void;
  onStartEditTitle: () => void;
  onKeyPressTitle: (e: React.KeyboardEvent) => void;
};

// LEVEL 1 of the page's own title hierarchy — everything here is challenge-level info only (see
// ChecklistFieldGroup's own "Sub Tasks" label, one level down, for the per-sub-task equivalent).
// Deliberately doesn't try to show a "start date"/"total goal" pair the way a fixed-duration
// challenge mockup might — ChecklistTemplate has no such fields (repeat.startedAt is the
// *schedule's* own anchor date, not a real "challenge created on" concept beyond `createdAt`, and
// there's no stored goal/target-duration field at all) — inventing one would mean fabricating
// data no create/edit flow actually writes.
const ParentTaskHeader = ({
  checklistTemplate,
  isTemplateReady,
  isOwner,
  currentDay,
  isEditingTitle,
  editedTitle,
  setEditedTitle,
  onStartEditTitle,
  onKeyPressTitle,
}: Props) => {
  const intl = useIntl();
  const { getChecklistRecords } = useChecklistRecord();

  const activeGroups = React.useMemo(
    () => (checklistTemplate ? getActiveFieldGroups(checklistTemplate.fieldGroups) : []),
    [checklistTemplate],
  );
  const day = React.useMemo(() => new Date(currentDay), [currentDay]);
  const groupsToday = React.useMemo(
    () => activeGroups.filter(group => isFieldGroupActiveOnDay(group.repeat, day)),
    [activeGroups, day],
  );

  // Same same-day record-presence check ChecklistFieldGroup's own useFieldGroupAccordion uses,
  // aggregated across every sub-task instead of just one — "how many of today's sub-tasks have
  // I actually logged something for" is the only "progress" this data model can answer honestly.
  const todayRange = React.useMemo(
    () => ({ from: startOfDay(day).toISOString(), to: endOfDay(day).toISOString() }),
    [day],
  );
  const todaysRecordsByDate = useSyncedSelector(
    getChecklistRecords,
    checklistTemplate?.id ?? '',
    { rangeDate: todayRange, type: 'date' as const },
  );
  const todaysFieldIds = React.useMemo(
    () => new Set(Object.values(todaysRecordsByDate).flat().map(record => record.fieldId)),
    [todaysRecordsByDate],
  );
  const doneToday = React.useMemo(
    () =>
      groupsToday.filter(group =>
        group.fields.some(field => todaysFieldIds.has(field.fieldId)),
      ).length,
    [groupsToday, todaysFieldIds],
  );
  const progressPercent = groupsToday.length > 0 ? Math.round((doneToday / groupsToday.length) * 100) : 0;

  if (!isTemplateReady || !checklistTemplate) {
    return (
      <Card className={styles.card}>
        <div className={styles.titleRow}>
          <Skeleton width={40} height={40} tone="page" circle />
          <Skeleton width={220} height={24} tone="page" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.card}>
      <div className={styles.titleRow}>
        <div
          className={styles.avatar}
          style={{ backgroundColor: `${checklistTemplate.avatar?.color || '#607d8b'}1f` }}
        >
          <Icon
            width={22}
            height={22}
            color={checklistTemplate.avatar?.color || '#607d8b'}
            icon={checklistTemplate.avatar?.name || 'solar:settings-linear'}
          />
        </div>
        <div className={styles.titleCol}>
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              onKeyDown={onKeyPressTitle}
              className={styles.titleInput}
              autoFocus
            />
          ) : (
            <div className={styles.titleDisplay}>
              <Typography.Title level={3} noMargin>
                {checklistTemplate.title}
              </Typography.Title>
              {isOwner && (
                <Button type="ghost" size="sm" onClick={onStartEditTitle} className={styles.editTitleButton}>
                  <Icon icon="solar:pen-new-square-linear" width={14} />
                </Button>
              )}
            </div>
          )}
          {groupsToday.length > 0 && (
            <Typography.Text className={styles.subTaskNames}>
              {groupsToday.map(group => group.title).join(' · ')}
            </Typography.Text>
          )}
        </div>
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <Icon width={18} icon="solar:calendar-linear" className={styles.statIcon} />
          <div>
            <Typography.Text className={styles.statLabel}>
              {intl.formatMessage({ id: 'ParentTaskHeader.frequency', defaultMessage: 'Frequency' })}
            </Typography.Text>
            <Typography.Text className={styles.statValue}>{formatTemplateSchedule(checklistTemplate)}</Typography.Text>
          </div>
        </div>
        <div className={styles.stat}>
          <Icon width={18} icon="solar:calendar-mark-linear" className={styles.statIcon} />
          <div>
            <Typography.Text className={styles.statLabel}>
              {intl.formatMessage({ id: 'ParentTaskHeader.started', defaultMessage: 'Started' })}
            </Typography.Text>
            <Typography.Text className={styles.statValue}>
              {format(new Date(checklistTemplate.createdAt), 'MMM d, yyyy')}
            </Typography.Text>
          </div>
        </div>
        <div className={styles.stat}>
          <Icon width={18} icon="solar:layers-linear" className={styles.statIcon} />
          <div>
            <Typography.Text className={styles.statLabel}>
              {intl.formatMessage({ id: 'ParentTaskHeader.sub-tasks', defaultMessage: 'Sub Tasks' })}
            </Typography.Text>
            <Typography.Text className={styles.statValue}>{activeGroups.length}</Typography.Text>
          </div>
        </div>
        <div className={styles.stat}>
          <Icon width={18} icon="solar:target-linear" className={styles.statIcon} />
          <div className={styles.progressStatBody}>
            <div className={styles.progressStatHeader}>
              <Typography.Text className={styles.statLabel}>
                {intl.formatMessage({ id: 'ParentTaskHeader.progress', defaultMessage: 'Today' })}
              </Typography.Text>
              <Typography.Text className={styles.statValue}>
                {groupsToday.length > 0
                  ? intl.formatMessage(
                      { id: 'ParentTaskHeader.progress-value', defaultMessage: '{{done}} / {{total}}' },
                      { done: doneToday, total: groupsToday.length },
                    )
                  : intl.formatMessage({ id: 'ParentTaskHeader.progress-none', defaultMessage: 'Not scheduled' })}
              </Typography.Text>
            </div>
            {groupsToday.length > 0 && (
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ParentTaskHeader;
