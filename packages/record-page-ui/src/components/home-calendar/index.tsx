import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import { startOfDay } from 'date-fns';
import type { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import cx from 'classnames';

import ViewSwitcher, { ViewMode } from '../view-switcher';
import { useCalendarEvents, CalendarEventProps } from './useCalendarEvents';
import styles from './index.module.scss';

const FC_VIEW_NAME: Record<ViewMode, string> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
  year: 'multiMonthYear',
};

// dayGrid/multiMonth cells are date-only, so a click there always means "go
// look at this day" — timeGrid's own slot clicks (picking an hour within a
// day/week already open) stay put instead of jumping views.
const DATE_ONLY_VIEWS: ViewMode[] = ['month', 'year'];

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag: string;
};

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// A real Google-Calendar-style Day/Week/Month/Year calendar, built on
// FullCalendar rather than this page's old hand-rolled WeekView/MonthView/
// YearView grids — a time-grid (hour rows down the side, days across the
// top) is what a week/day view actually needs, which those never had.
const HomeCalendar = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const calendarRef = React.useRef<FullCalendar>(null);
  const [mode, setMode] = React.useState<ViewMode>('month');
  const [range, setRange] = React.useState<{ from: Date; to: Date } | null>(null);

  const events = useCalendarEvents(range, selectedTag);

  React.useEffect(() => {
    calendarRef.current?.getApi().changeView(FC_VIEW_NAME[mode]);
  }, [mode]);

  // One-directional: an externally-changed `currentDate` (the mini calendar,
  // "Today" elsewhere on the page) re-centers the view. Browsing with this
  // calendar's own prev/next/today buttons never writes back here, so paging
  // ahead a few months doesn't fight the shared date the next time this
  // effect runs for an unrelated reason.
  React.useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api && !sameDay(api.getDate(), currentDate)) {
      api.gotoDate(currentDate);
    }
  }, [currentDate]);

  const handleDatesSet = (arg: DatesSetArg) => {
    setRange({ from: arg.start, to: arg.end });
  };

  const handleDateClick = (arg: DateClickArg) => {
    onDateChange(startOfDay(arg.date));
    if (DATE_ONLY_VIEWS.includes(mode)) {
      setMode('day');
    }
  };

  const handleEventClick = (arg: EventClickArg) => {
    const { navigateTo } = arg.event.extendedProps as CalendarEventProps;
    navigate(navigateTo);
  };

  // Time-grid (day/week) keeps FullCalendar's own block rendering — a real
  // colored, time-positioned block is exactly right there. Every other view
  // (month, year) gets a dot + truncated title instead, matching this app's
  // pre-existing MonthView chip look rather than a full-width filled bar.
  const renderEventContent = (arg: EventContentArg) => {
    if (arg.view.type === 'timeGridDay' || arg.view.type === 'timeGridWeek') {
      return true;
    }
    const done = arg.event.classNames.includes('home-calendar-event-done');
    return (
      <div className={cx(styles.eventPill, done && styles.eventPillDone)}>
        <span className={styles.eventDot} style={{ background: arg.event.backgroundColor }} />
        <span className={styles.eventTitle}>{arg.event.title}</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ViewSwitcher value={mode} onChange={setMode} />
      </div>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
        initialView={FC_VIEW_NAME[mode]}
        initialDate={currentDate}
        firstDay={1}
        height={mode === 'week' || mode === 'day' ? 700 : 'auto'}
        dayMaxEvents={3}
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        buttonText={{ today: intl.formatMessage({ id: 'home-calendar.today', defaultMessage: 'Today' }) }}
        events={events}
        eventContent={renderEventContent}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />
    </div>
  );
};

export default HomeCalendar;
