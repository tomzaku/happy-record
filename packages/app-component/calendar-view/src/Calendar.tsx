import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import multiMonthPlugin from '@fullcalendar/multimonth';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, DayHeaderContentArg, EventClickArg, EventContentArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { Icon } from '@moon-ui/icon/Icon';
import cx from 'classnames';

import { CalendarEvent, CalendarRange, CalendarViewMode } from './types';
import styles from './Calendar.module.scss';

const FC_VIEW_NAME: Record<CalendarViewMode, string> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
  year: 'multiMonthYear',
};

const DEFAULT_EVENT_COLOR = '#6b7280';

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

type Props = {
  view: CalendarViewMode;
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onRangeChange: (range: CalendarRange) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  /** Localized "Today" button label — this package has no i18n of its own. */
  todayLabel?: string;
  /** Rendered on the right of the toolbar, next to the nav controls — typically the host app's own Day/Week/Month/Year switcher. */
  rightSlot?: React.ReactNode;
  className?: string;
};

// A Google/Bryntum-Calendar-style wrapper around FullCalendar: one hand-built
// toolbar (nav + title on the left, `rightSlot` on the right) and one
// consistent event style (a tinted fill of the event's own color with a solid
// left border) across every view, instead of FullCalendar's own toolbar and
// default event rendering — which looks like a bare dot+text for a timed
// event and a full solid-fill bar for an all-day one, and whose own default
// button styling fights a host app's theme on CSS specificity.
const Calendar = ({
  view,
  currentDate,
  events,
  onDateChange,
  onRangeChange,
  onEventClick,
  onDateClick,
  todayLabel = 'Today',
  rightSlot,
  className,
}: Props) => {
  const calendarRef = React.useRef<FullCalendar>(null);
  const [title, setTitle] = React.useState('');
  const isGridView = view === 'month' || view === 'year';

  React.useEffect(() => {
    calendarRef.current?.getApi().changeView(FC_VIEW_NAME[view]);
  }, [view]);

  // One-directional: an externally-changed `currentDate` re-centers the
  // view. Browsing with this calendar's own prev/next/today buttons never
  // writes back here, so paging ahead a few months doesn't fight the shared
  // date the next time this effect runs for an unrelated reason.
  React.useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (api && !sameDay(api.getDate(), currentDate)) {
      api.gotoDate(currentDate);
    }
  }, [currentDate]);

  const handleDatesSet = (arg: DatesSetArg) => {
    onRangeChange({ from: arg.start, to: arg.end });
    setTitle(arg.view.title);
  };

  const handleDateClick = (arg: DateClickArg) => {
    const date = startOfDay(arg.date);
    onDateChange(date);
    onDateClick?.(date);
  };

  const handleEventClick = (arg: EventClickArg) => {
    onEventClick?.(arg.event.extendedProps.source as CalendarEvent);
  };

  const renderEventContent = (arg: EventContentArg) => {
    const source = arg.event.extendedProps.source as CalendarEvent;
    const color = source.color || DEFAULT_EVENT_COLOR;
    return (
      <div
        className={cx(styles.eventBlock, source.done && styles.eventBlockDone)}
        style={
          {
            // Resting/hover backgrounds are both `color-mix()`s off this one
            // custom property (see Calendar.module.scss) rather than a
            // background set here directly — a `:hover` rule in the
            // stylesheet can't otherwise win against an inline style without
            // reaching for `!important`.
            '--event-color': color,
            borderLeftColor: color,
            color: `color-mix(in srgb, ${color} 70%, var(--cv-event-contrast))`,
          } as React.CSSProperties
        }
      >
        {!arg.event.allDay && arg.timeText && <span className={styles.eventTime}>{arg.timeText}</span>}
        {/* Set directly rather than relying only on `.eventBlockDone .eventTitle` in the
            stylesheet — this event's title text also carries the inline `color` above, and an
            inline style here is what reliably wins over that regardless of module-nesting
            specificity. */}
        <span
          className={styles.eventTitle}
          style={source.done ? { textDecoration: 'line-through' } : undefined}
        >
          {arg.event.title}
        </span>
      </div>
    );
  };

  // Two rows — weekday name, then (for a real single-date column, i.e.
  // week/day, not month/year's "every Monday" header) the day-of-month
  // number, circled and accented when it's today. Weekend columns get their
  // own color on both rows.
  const renderDayHeaderContent = (arg: DayHeaderContentArg) => {
    const isToday = sameDay(arg.date, new Date());
    const isWeekend = arg.date.getDay() === 0 || arg.date.getDay() === 6;
    const showDayNumber = arg.view.type === 'timeGridDay' || arg.view.type === 'timeGridWeek';
    return (
      <div className={styles.dayHeader}>
        <span className={cx(styles.dayHeaderLabel, isWeekend && styles.dayHeaderWeekend)}>
          {arg.date.toLocaleDateString(undefined, { weekday: 'short' })}
        </span>
        {showDayNumber && (
          <span
            className={cx(
              styles.dayHeaderNumber,
              isToday && styles.dayHeaderNumberToday,
              !isToday && isWeekend && styles.dayHeaderWeekend,
            )}
          >
            {arg.date.getDate()}
          </span>
        )}
      </div>
    );
  };

  const fcEvents = React.useMemo(
    () =>
      events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        // `done` is duplicated here, flat, alongside `source` — FullCalendar's
        // own `eventOrder` field-spec strings only look up plain top-level
        // properties (see `buildSegCompareObj`/`compareByFieldSpec`), so a
        // nested `source.done` isn't sortable by name the way this flat copy is.
        extendedProps: { source: event, done: event.done },
      })),
    [events],
  );

  // Week/day's all-day row (see `allDayText=""` below) is otherwise always
  // there even with nothing in it — `allDaySlot` is the option that removes
  // the row entirely, so this only shows it once there's a real all-day
  // event for the visible range.
  const hasAllDayEvents = events.some(event => event.allDay);

  return (
    <div className={cx(styles.container, className)}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button type="button" className={styles.todayButton} onClick={() => calendarRef.current?.getApi().today()}>
            {todayLabel}
          </button>
          <button
            type="button"
            className={styles.navButton}
            aria-label="Previous"
            onClick={() => calendarRef.current?.getApi().prev()}
          >
            <Icon width={18} icon="basil:skip-prev-outline" />
          </button>
          <button
            type="button"
            className={styles.navButton}
            aria-label="Next"
            onClick={() => calendarRef.current?.getApi().next()}
          >
            <Icon width={18} icon="basil:skip-next-outline" />
          </button>
          <span className={styles.title}>{title}</span>
        </div>
        {rightSlot}
      </div>
      {/* Month/year's own grid cells want a tall, fixed min-height (room for a
          day number + up to 3 event chips); week/day's all-day row reuses that
          exact same cell renderer and must NOT inherit it, or it balloons to a
          month cell's height for a row that only ever holds one line of chips.
          FullCalendar gives every view root a `fc-<type>-view` class, but that
          name isn't a stable part of its public API — gating on our own
          `view` prop here instead of guessing at that class is what actually
          scopes the CSS rule reliably. */}
      <div className={cx(styles.fcRoot, isGridView && styles.fcRootGrid)}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView={FC_VIEW_NAME[view]}
          initialDate={currentDate}
          headerToolbar={false}
          firstDay={1}
          fixedWeekCount={false}
          height={view === 'week' || view === 'day' ? 700 : 'auto'}
          dayMaxEvents={3}
          // Completed tasks sink to the bottom of each day's event list —
          // `done` first, everything else falling back to FullCalendar's own
          // default ordering (its default `eventOrder` value, minus `start`
          // since these are otherwise unsorted all-day chips as often as
          // timed events).
          eventOrder="done,start,-duration,allDay,title"
          allDaySlot={hasAllDayEvents}
          allDayText=""
          displayEventEnd={false}
          nowIndicator
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          events={fcEvents}
          eventContent={renderEventContent}
          dayHeaderContent={renderDayHeaderContent}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
        />
      </div>
    </div>
  );
};

export default Calendar;
