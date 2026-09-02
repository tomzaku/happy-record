import React from 'react';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import { motion } from 'motion/react';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import ViewSwitcher, { ViewMode } from '@dreamer/record-page-ui/src/components/view-switcher';
import switcherStyles from '@dreamer/record-page-ui/src/components/view-switcher/index.module.scss';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import styles from './index.module.scss';

type Props = {
  /** Omit for a "bare" usage that already lives inside another collapsible
   * card — a field group's own History tab (ChecklistFieldGroupHistory) is
   * already inside ChecklistFieldGroup's own Card/collapse/header, so it
   * only wants the switcher toolbar + Hr + body, not a second nested Card
   * with its own title and chevron. Provide it for a standalone section
   * (ChecklistTemplateCalendar) and it gets the full Card/chevron-collapse/
   * Hr shape every ChecklistFieldGroup card has. */
  title?: React.ReactNode;
  /** Card mode only — open by default, since a section a viewer has to
   * click to even discover isn't "history," it's a hidden feature. */
  defaultCollapsed?: boolean;
  renderList: () => React.ReactNode;
  renderCalendar: (mode: ViewMode) => React.ReactNode;
};

const CALENDAR_MODES: ViewMode[] = ['week', 'month', 'year'];

// The one place that owns "History" as a concept on this page: a
// List/Calendar toggle over a sized body, either standing alone as its own
// collapsible Card (chevron-rotate + Hr divider, same shape as every
// ChecklistFieldGroup card — see ChecklistFieldGroupHeader) when `title` is
// given, or bare (just the toolbar + Hr + body) when it isn't, for a caller
// that's already inside one of those cards. ChecklistTemplateCalendar (the
// task's own history) uses the card shape; ChecklistFieldGroupHistory (each
// field group's own, inside its group's own tab) uses the bare one — both
// only differ in what List and Calendar actually render, which is exactly
// what `renderList`/`renderCalendar` carry.
const HistorySection = ({ title, defaultCollapsed = false, renderList, renderCalendar }: Props) => {
  const intl = useIntl();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [mode, setMode] = React.useState<'list' | 'calendar'>('list');
  const [calendarMode, setCalendarMode] = React.useState<ViewMode>('week');

  const switcher = (
    <div className={styles.headerControls} onClick={e => e.stopPropagation()}>
      <div className={switcherStyles.container}>
        <button
          type="button"
          className={cx(switcherStyles.option, mode === 'list' && switcherStyles.active)}
          onClick={() => setMode('list')}
        >
          <Typography.Text className={switcherStyles.label}>
            {intl.formatMessage({ id: 'checklist-template-calendar.mode-list', defaultMessage: 'List' })}
          </Typography.Text>
        </button>
        <button
          type="button"
          className={cx(switcherStyles.option, mode === 'calendar' && switcherStyles.active)}
          onClick={() => setMode('calendar')}
        >
          <Typography.Text className={switcherStyles.label}>
            {intl.formatMessage({ id: 'checklist-template-calendar.mode-calendar', defaultMessage: 'Calendar' })}
          </Typography.Text>
        </button>
      </div>
      {mode === 'calendar' && <ViewSwitcher value={calendarMode} onChange={setCalendarMode} modes={CALENDAR_MODES} />}
    </div>
  );

  const body = (
    <div className={mode === 'list' ? styles.bodyList : styles.bodyCalendar}>
      {mode === 'list' ? renderList() : renderCalendar(calendarMode)}
    </div>
  );

  if (!title) {
    return (
      <div className={styles.bare}>
        <div className={styles.bareToolbar}>{switcher}</div>
        <Hr classes={{ hr: styles.hr, container: styles.hrContainer }} />
        {body}
      </div>
    );
  }

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow} onClick={() => setIsCollapsed(prev => !prev)}>
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: isCollapsed ? -180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={styles.iconGroup}
          >
            <Icon className={styles.collapseIcon} width={20} icon="solar:alt-arrow-down-line-duotone" />
          </motion.div>
          <Typography.Title level={5} noMargin>
            {title}
          </Typography.Title>
        </div>
        {switcher}
      </div>

      <Hr classes={{ hr: styles.hr, container: styles.hrContainer }} />

      <motion.div
        initial={false}
        animate={{ height: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
        transition={{
          height: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className={styles.collapsible}
      >
        {body}
      </motion.div>
    </Card>
  );
};

export default HistorySection;
