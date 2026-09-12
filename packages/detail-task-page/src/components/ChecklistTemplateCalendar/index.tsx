import React from 'react';
import { useIntl } from '@dreamer/translation';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import MiniMonthCalendar from '@dreamer/record-page-ui/src/components/mini-month-calendar';
import HistoryList from './HistoryList';
import styles from './index.module.scss';

type Props = {
  checklistTemplateId: string;
  fields: RecordField[];
  /** Called with a clicked day so the page itself can jump this task's
   * fields/history to that day — see index.desktop.tsx's own
   * `handleCalendarDaySelect`. */
  onDaySelect: (date: Date) => void;
};

// A simple calendar panel — the same shape as the home page's own right-sidebar calendar
// (MiniMonthCalendar + a short recent-activity list underneath it), not the full List/Calendar-
// toggle History section this used to share with each field group's own history tab
// (ChecklistFieldGroupHistory still uses that one — see HistorySection). Scoped to just this one
// template's own checklist instances (MiniMonthCalendar's own `checklistTemplateId` prop) rather
// than everything due that day, since this panel only ever answers "did I do this specific task."
// Desktop only — index.desktop.tsx renders this in its own right column; mobile doesn't show it
// at all (index.mobile.tsx has its own page-level WeeklyRow instead).
const ChecklistTemplateCalendar = ({ checklistTemplateId, fields, onDaySelect }: Props) => {
  const intl = useIntl();
  const [currentDate, setCurrentDate] = React.useState(() => new Date());

  const handleDaySelect = (date: Date) => {
    setCurrentDate(date);
    onDaySelect(date);
  };

  return (
    <Card className={styles.calendarPanel}>
      <MiniMonthCalendar
        currentDate={currentDate}
        onDateChange={handleDaySelect}
        checklistTemplateId={checklistTemplateId}
      />
      <div className={styles.recentSection}>
        <Typography.Text className={styles.recentLabel}>
          {intl.formatMessage({ id: 'checklist-template-calendar.recent', defaultMessage: 'Recent' })}
        </Typography.Text>
        <HistoryList checklistTemplateId={checklistTemplateId} fields={fields} onDaySelect={handleDaySelect} />
      </div>
    </Card>
  );
};

export default ChecklistTemplateCalendar;
