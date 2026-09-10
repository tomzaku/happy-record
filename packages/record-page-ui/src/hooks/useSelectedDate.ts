import React from 'react';

const STORAGE_KEY = 'home-selected-day';

/**
 * The homepage's selected day, persisted to sessionStorage (not the URL) so a plain reload keeps
 * the day you were on, but landing on `/` fresh — a new tab, or the browser's own address-bar
 * autocomplete offering a previously-visited `/?currentDay=...` — always starts on today, per the
 * "Today" default the homepage promises. This used to round-trip through a `?currentDay=` URL
 * param; nothing else in the app ever deep-links into `/` with that param (unlike detail-task-page's
 * own `currentDay`, which real cross-page links rely on), so the URL had no upside here and was
 * exactly what made a stale day stick around in browser history for autocomplete to resurface.
 */
export function useSelectedDate(): [Date, (date: Date) => void] {
  const [selectedDate, setSelectedDateState] = React.useState<Date>(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      const parsed = stored ? new Date(stored) : null;
      return parsed && !isNaN(parsed.getTime()) ? parsed : new Date();
    } catch {
      return new Date();
    }
  });

  const setSelectedDate = React.useCallback((date: Date) => {
    setSelectedDateState(date);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, date.toISOString());
    } catch {
      // sessionStorage can throw (private browsing, storage full) — the state above already updated.
    }
  }, []);

  return [selectedDate, setSelectedDate];
}
