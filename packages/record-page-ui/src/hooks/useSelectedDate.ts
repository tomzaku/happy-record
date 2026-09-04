import React from 'react';
import { useSearchParams } from 'react-router-dom';

const DATE_PARAM = 'currentDay';

/**
 * The homepage's selected day, synced with the `?currentDay=` URL param — same param name/shape
 * (a full ISO instant, round-tripped via `date.toISOString()`/`new Date(...)`) detail-task-page's
 * own `/task/:id` route already uses for the same purpose, so reloading the page or navigating
 * back to it lands on the day that was actually selected instead of silently resetting to today.
 *
 * Only ever set from `setSelectedDate` (every calendar surface on the homepage — MiniMonthCalendar,
 * WeekView, WeeklyCalendar, MonthView/YearView's day click — already shares the one `setStartDate`
 * this replaces), so there's exactly one place the URL gets touched. Written with `replace: true`
 * so flipping through several days in a row doesn't pile up a back-button history entry per day —
 * this is "which day am I looking at," not a navigation the back button should step through.
 */
export function useSelectedDate(): [Date, (date: Date) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDateState] = React.useState<Date>(() => {
    const param = searchParams.get(DATE_PARAM);
    const parsed = param ? new Date(param) : null;
    return parsed && !isNaN(parsed.getTime()) ? parsed : new Date();
  });

  const setSelectedDate = React.useCallback(
    (date: Date) => {
      setSelectedDateState(date);
      setSearchParams(
        prev => {
          const next = new URLSearchParams(prev);
          next.set(DATE_PARAM, date.toISOString());
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [selectedDate, setSelectedDate];
}
