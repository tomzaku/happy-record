import React from 'react';
import { useIntl } from '@dreamer/translation';
import { CalendarEvent } from '@dreamer/calendar-view';
import CalendarEventsView from '@dreamer/record-page-ui/src/components/calendar-events-view';
import { CalendarEventData } from '@dreamer/record-page-ui/src/components/calendar-events-view/useCalendarEvents';
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

// Reuses the home page's own `CalendarEventsView` (see that component's own doc comment) scoped
// to this one template via `checklistTemplateId` instead of "everything scheduled today" — same
// event styling/completion indicator as the home page, now reading as this task's own history
// rather than a mixed feed. The collapsible-card/List-Calendar-toggle chrome itself lives in
// HistorySection, shared with each field group's own History tab (ChecklistFieldGroupHistory) —
// this component only supplies what List and Calendar actually render for the whole task.
const ChecklistTemplateCalendar = ({ checklistTemplateId, fields, onDaySelect }: Props) => {
  const intl = useIntl();
  const [currentDate, setCurrentDate] = React.useState(() => new Date());

  const handleDaySelect = (date: Date) => {
    setCurrentDate(date);
    onDaySelect(date);
  };

  // A click on an event chip (a specific task's own checklist instance) doesn't fire
  // CalendarEventsView's own onDateChange the way clicking empty grid space does — FullCalendar
  // treats the two as separate gestures — so this task's history needs its own handler to still
  // land on that day, same as clicking anywhere else in the cell.
  const handleEventClick = (event: CalendarEvent) => {
    const { date } = event.data as CalendarEventData;
    handleDaySelect(date);
  };

  return (
    <HistorySection
      title={intl.formatMessage({ id: 'checklist-template-calendar.title', defaultMessage: 'History' })}
      renderList={() => (
        <HistoryList checklistTemplateId={checklistTemplateId} fields={fields} onDaySelect={handleDaySelect} />
      )}
      renderCalendar={mode => (
        <CalendarEventsView
          view={mode}
          currentDate={currentDate}
          onDateChange={handleDaySelect}
          checklistTemplateId={checklistTemplateId}
          onEventClick={handleEventClick}
          todayLabel={intl.formatMessage({ id: 'home-calendar.today', defaultMessage: 'Today' })}
        />
      )}
    />
  );
};

export default ChecklistTemplateCalendar;
