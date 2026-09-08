import React from 'react';
import Calendar, { CalendarViewMode, CalendarRange, CalendarEvent } from '@dreamer/calendar-view';
import { useCalendarEvents } from './useCalendarEvents';

type Props = {
  view: CalendarViewMode;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  /** Scopes every rendered event to one template's own checklist instance — the home page's own
   * usage leaves this unset. See `useCalendarEvents`'s own doc comment. */
  checklistTemplateId?: string;
  selectedTag?: string;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  todayLabel?: string;
  rightSlot?: React.ReactNode;
  className?: string;
};

// The checklist-data wiring shared between the home page's own calendar (`HomeCalendar`, unscoped
// and tag-filterable) and a single task's own history calendar (`ChecklistTemplateCalendar` in
// detail-task-page, scoped via `checklistTemplateId`) — each of those owns its own view-mode
// state, toolbar/switcher, and click behavior on top of this; this component only tracks the
// visible `range` FullCalendar reports (via `@dreamer/calendar-view`'s own `onRangeChange`) and
// turns it into events through `useCalendarEvents`.
const CalendarEventsView = ({
  view,
  currentDate,
  onDateChange,
  checklistTemplateId,
  selectedTag = 'all',
  onEventClick,
  onDateClick,
  todayLabel,
  rightSlot,
  className,
}: Props) => {
  const [range, setRange] = React.useState<CalendarRange | null>(null);
  const events = useCalendarEvents(range, selectedTag, checklistTemplateId);

  return (
    <Calendar
      view={view}
      currentDate={currentDate}
      events={events}
      onDateChange={onDateChange}
      onRangeChange={setRange}
      onDateClick={onDateClick}
      onEventClick={onEventClick}
      todayLabel={todayLabel}
      rightSlot={rightSlot}
      className={className}
    />
  );
};

export default CalendarEventsView;
