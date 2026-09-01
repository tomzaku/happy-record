import React from 'react';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import ViewSwitcher, { ViewMode } from '@dreamer/record-page-ui/src/components/view-switcher';
import WeekView from '@dreamer/record-page-ui/src/components/week-view';
import MonthView from '@dreamer/record-page-ui/src/components/month-view';
import YearView from '@dreamer/record-page-ui/src/components/year-view';
import styles from './index.module.scss';

type Props = {
  checklistTemplateId: string;
  /** Called with a clicked day so the page itself can jump this task's
   * fields/history to that day — see index.desktop.tsx/index.mobile.tsx's
   * own `handleCalendarDaySelect`. */
  onDaySelect: (date: Date) => void;
};

const CALENDAR_MODES: ViewMode[] = ['week', 'month', 'year'];

// Reuses the home page's own week/month/year views (see record-page-ui's
// CLAUDE.md-documented `checklistTemplateId` filter) scoped to this one
// template instead of "everything scheduled today" — same completion
// indicators (WeekView's checkmark, MonthView's checkmark chip, YearView's
// heatmap), now reading as this task's own history rather than a mixed feed.
const ChecklistTemplateCalendar = ({ checklistTemplateId, onDaySelect }: Props) => {
  const intl = useIntl();
  const [mode, setMode] = React.useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = React.useState(() => new Date());

  const handleDaySelect = (date: Date) => {
    setCurrentDate(date);
    onDaySelect(date);
  };

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <Typography.Title level={5} noMargin>
          {intl.formatMessage({
            id: 'checklist-template-calendar.title',
            defaultMessage: 'Completion Calendar',
          })}
        </Typography.Title>
        <ViewSwitcher value={mode} onChange={setMode} modes={CALENDAR_MODES} />
      </div>
      <div className={styles.body}>
        {mode === 'week' && (
          <WeekView
            currentDate={currentDate}
            onDateChange={handleDaySelect}
            checklistTemplateId={checklistTemplateId}
          />
        )}
        {mode === 'month' && (
          <MonthView
            currentDate={currentDate}
            onDaySelect={handleDaySelect}
            checklistTemplateId={checklistTemplateId}
          />
        )}
        {mode === 'year' && (
          <YearView
            currentDate={currentDate}
            onDaySelect={handleDaySelect}
            checklistTemplateId={checklistTemplateId}
          />
        )}
      </div>
    </Card>
  );
};

export default ChecklistTemplateCalendar;
