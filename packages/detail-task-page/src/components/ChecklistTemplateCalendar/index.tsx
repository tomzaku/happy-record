import React from 'react';
import { useIntl } from '@dreamer/translation';
import WeekView from '@dreamer/record-page-ui/src/components/week-view';
import MonthView from '@dreamer/record-page-ui/src/components/month-view';
import YearView from '@dreamer/record-page-ui/src/components/year-view';
import { RecordField } from '@dreamer/global/src/store/record-field';
import HistoryList from './HistoryList';
import HistorySection from '../HistorySection';

type Props = {
  checklistTemplateId: string;
  fields: RecordField[];
  /** Called with a clicked day so the page itself can jump this task's
   * fields/history to that day — see index.desktop.tsx/index.mobile.tsx's
   * own `handleCalendarDaySelect`. */
  onDaySelect: (date: Date) => void;
};

// Reuses the home page's own week/month/year views (see record-page-ui's
// CLAUDE.md-documented `checklistTemplateId` filter) scoped to this one
// template instead of "everything scheduled today" — same completion
// indicators (WeekView's checkmark, MonthView's checkmark chip, YearView's
// heatmap), now reading as this task's own history rather than a mixed feed.
// The collapsible-card/List-Calendar-toggle chrome itself lives in
// HistorySection, shared with each field group's own History tab
// (ChecklistFieldGroupHistory) — this component only supplies what List and
// Calendar actually render for the whole task.
const ChecklistTemplateCalendar = ({ checklistTemplateId, fields, onDaySelect }: Props) => {
  const intl = useIntl();
  const [currentDate, setCurrentDate] = React.useState(() => new Date());

  const handleDaySelect = (date: Date) => {
    setCurrentDate(date);
    onDaySelect(date);
  };

  return (
    <HistorySection
      title={intl.formatMessage({ id: 'checklist-template-calendar.title', defaultMessage: 'History' })}
      renderList={() => (
        <HistoryList checklistTemplateId={checklistTemplateId} fields={fields} onDaySelect={handleDaySelect} />
      )}
      renderCalendar={mode => {
        if (mode === 'month') {
          return (
            <MonthView
              currentDate={currentDate}
              onDaySelect={handleDaySelect}
              checklistTemplateId={checklistTemplateId}
            />
          );
        }
        if (mode === 'year') {
          return (
            <YearView
              currentDate={currentDate}
              onDaySelect={handleDaySelect}
              checklistTemplateId={checklistTemplateId}
            />
          );
        }
        return (
          <WeekView
            currentDate={currentDate}
            onDateChange={handleDaySelect}
            checklistTemplateId={checklistTemplateId}
          />
        );
      }}
    />
  );
};

export default ChecklistTemplateCalendar;
