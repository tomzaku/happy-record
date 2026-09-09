import React from 'react';
import { CalendarViewMode, CalendarEvent } from '@dreamer/calendar-view';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';

import ViewSwitcher, { ViewMode } from '../view-switcher';
import CalendarEventsView from '../calendar-events-view';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';
import TaskDetailModal from './TaskDetailModal';

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
// app's own translated Day/Week/Month/Year switcher as the toolbar's `rightSlot`, and a
// quick-look `TaskDetailModal` on event click rather than navigating straight to the detail
// page — that's still one button away, via the modal's own footer action.
// `ChecklistTemplateCalendar` (detail-task-page) is the other consumer, scoped to one template
// instead.
const HomeCalendar = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [mode, setMode] = React.useState<CalendarViewMode>('month');
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  const handleDateClick = () => {
    if (DATE_ONLY_VIEWS.includes(mode)) {
      setMode('day');
    }
  };

  const handleViewDetails = ({ checklistTemplateId, checklistId, date }: CalendarEventData) => {
    const params = new URLSearchParams({ currentDay: date.toISOString() });
    if (checklistId) params.set('checklistId', checklistId);
    setSelectedEvent(null);
    navigate(`/task/${checklistTemplateId}?${params.toString()}`);
  };

  return (
    <>
      <CalendarEventsView
        view={mode}
        currentDate={currentDate}
        onDateChange={onDateChange}
        selectedTag={selectedTag}
        onDateClick={handleDateClick}
        onEventClick={setSelectedEvent}
        todayLabel={intl.formatMessage({ id: 'home-calendar.today', defaultMessage: 'Today' })}
        rightSlot={<ViewSwitcher value={mode} onChange={setMode} />}
      />
      <TaskDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onViewDetails={handleViewDetails}
      />
    </>
  );
};

export default HomeCalendar;
