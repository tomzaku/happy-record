import React from 'react';
import Calendar, { CalendarViewMode, CalendarRange, CalendarEvent } from '@dreamer/calendar-view';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';

import ViewSwitcher, { ViewMode } from '../view-switcher';
import { useCalendarEvents, CalendarEventData } from './useCalendarEvents';

// dayGrid/multiMonth cells are date-only, so a click there always means "go
// look at this day" — timeGrid's own slot clicks (picking an hour within a
// day/week already open) stay put instead of jumping views.
const DATE_ONLY_VIEWS: ViewMode[] = ['month', 'year'];

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag: string;
};

// The home page's own wiring of `@dreamer/calendar-view`'s generic Calendar —
// this app's checklist data mapped to its `CalendarEvent` shape, this app's
// own translated Day/Week/Month/Year switcher as the toolbar's `rightSlot`,
// and navigation to a clicked task's detail page.
const HomeCalendar = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [mode, setMode] = React.useState<CalendarViewMode>('month');
  const [range, setRange] = React.useState<CalendarRange | null>(null);

  const events = useCalendarEvents(range, selectedTag);

  const handleDateClick = () => {
    if (DATE_ONLY_VIEWS.includes(mode)) {
      setMode('day');
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    const { checklistTemplateId, checklistId, date } = event.data as CalendarEventData;
    const params = new URLSearchParams({ currentDay: date.toISOString() });
    if (checklistId) params.set('checklistId', checklistId);
    navigate(`/task/${checklistTemplateId}?${params.toString()}`);
  };

  return (
    <Calendar
      view={mode}
      currentDate={currentDate}
      events={events}
      onDateChange={onDateChange}
      onRangeChange={setRange}
      onDateClick={handleDateClick}
      onEventClick={handleEventClick}
      todayLabel={intl.formatMessage({ id: 'home-calendar.today', defaultMessage: 'Today' })}
      rightSlot={<ViewSwitcher value={mode} onChange={setMode} />}
    />
  );
};

export default HomeCalendar;
