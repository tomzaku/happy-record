import React from 'react';
import { CalendarViewMode, CalendarEvent } from '@dreamer/calendar-view';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';

import ViewSwitcher, { ViewMode } from '../view-switcher';
import CalendarEventsView from '../calendar-events-view';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';

// dayGrid/multiMonth cells are date-only, so a click there always means "go
// look at this day" — timeGrid's own slot clicks (picking an hour within a
// day/week already open) stay put instead of jumping views.
const DATE_ONLY_VIEWS: ViewMode[] = ['month', 'year'];

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag: string;
};

// The home page's own layer on top of `CalendarEventsView` (unscoped, every template) — this
// app's own translated Day/Week/Month/Year switcher as the toolbar's `rightSlot`, and navigation
// to a clicked task's detail page. `ChecklistTemplateCalendar` (detail-task-page) is the other
// consumer, scoped to one template instead.
const HomeCalendar = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [mode, setMode] = React.useState<CalendarViewMode>('month');

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
    <CalendarEventsView
      view={mode}
      currentDate={currentDate}
      onDateChange={onDateChange}
      selectedTag={selectedTag}
      onDateClick={handleDateClick}
      onEventClick={handleEventClick}
      todayLabel={intl.formatMessage({ id: 'home-calendar.today', defaultMessage: 'Today' })}
      rightSlot={<ViewSwitcher value={mode} onChange={setMode} />}
    />
  );
};

export default HomeCalendar;
