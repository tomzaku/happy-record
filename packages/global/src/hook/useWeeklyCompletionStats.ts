import React from 'react';
import { addWeeks, eachDayOfInterval, endOfWeek, startOfWeek, subWeeks } from 'date-fns';
import { useChecklist } from '../store/checklists';

export type DailyCompletionStat = {
  date: Date;
  total: number;
  completed: number;
};

export type WeeklyCompletionStats = {
  weekStart: Date;
  weekEnd: Date;
  days: DailyCompletionStat[];
  total: number;
  completed: number;
  /** 0-100, rounded; 0 (not NaN) when nothing was scheduled that week. */
  percent: number;
};

type GetChecklistForDateWithoutFetching = ReturnType<
  typeof useChecklist
>['getChecklistForDateWithoutFetching'];

// Shared by both hooks below — not a hook itself (a plain function taking
// the store read as a parameter), so it's fine to call it in a loop the way
// useCompletionTrend does across several weeks at once.
const getDailyStat = (
  getChecklistForDateWithoutFetching: GetChecklistForDateWithoutFetching,
  date: Date,
): DailyCompletionStat => {
  const { checklist, checklistIds } = getChecklistForDateWithoutFetching({ date });
  const completed = checklistIds.filter(id => checklist[id]?.completedAt).length;
  return { date, total: checklistIds.length, completed };
};

const summarize = (days: DailyCompletionStat[]) => {
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const completed = days.reduce((sum, day) => sum + day.completed, 0);
  return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
};

/**
 * Percentage of this (or any) week's scheduled tasks actually completed —
 * the home page's mini dashboard and the full `/dashboard` page both derive
 * from this one hook rather than duplicating the per-day aggregation.
 *
 * Monday-start week (`weekStartsOn: 1`), matching WeeklyCalendarVertical/
 * Horizontal and WeekView's own convention everywhere else in the app.
 *
 * Reuses `getChecklistForDateWithoutFetching` per day — the same "scheduled
 * template instances for this day, computed from whatever's already in the
 * store" read `WeeklyCalendarVertical` already relies on — after one range
 * fetch for the whole week via `ensureChecklistsFetched`, rather than a
 * fetch per day.
 */
export const useWeeklyCompletionStats = (referenceDate: Date): WeeklyCompletionStats => {
  const { ensureChecklistsFetched, getChecklistForDateWithoutFetching } = useChecklist();

  const weekStart = React.useMemo(
    () => startOfWeek(referenceDate, { weekStartsOn: 1 }),
    [referenceDate],
  );
  const weekEnd = React.useMemo(
    () => endOfWeek(referenceDate, { weekStartsOn: 1 }),
    [referenceDate],
  );

  React.useEffect(() => {
    ensureChecklistsFetched({ from: weekStart, to: weekEnd });
  }, [ensureChecklistsFetched, weekStart, weekEnd]);

  // Depends on `getChecklistForDateWithoutFetching` itself, not a hand-picked
  // list of what "should" affect it — see CLAUDE.md's useSyncedSelector note
  // on why that's the only way this reliably recomputes once the store it
  // reads actually changes.
  return React.useMemo(() => {
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(date =>
      getDailyStat(getChecklistForDateWithoutFetching, date),
    );
    return { weekStart, weekEnd, days, ...summarize(days) };
  }, [weekStart, weekEnd, getChecklistForDateWithoutFetching]);
};

export type WeekCompletionSummary = {
  weekStart: Date;
  weekEnd: Date;
  total: number;
  completed: number;
  percent: number;
};

/**
 * The same weekly completion rate as useWeeklyCompletionStats, but for the
 * last `weeksCount` weeks (oldest first, ending with `referenceDate`'s own
 * week) — the full dashboard page's trend chart, so a bad week reads as part
 * of a pattern instead of an isolated stat.
 */
export const useCompletionTrend = (
  referenceDate: Date,
  weeksCount = 8,
): WeekCompletionSummary[] => {
  const { ensureChecklistsFetched, getChecklistForDateWithoutFetching } = useChecklist();

  const currentWeekStart = React.useMemo(
    () => startOfWeek(referenceDate, { weekStartsOn: 1 }),
    [referenceDate],
  );
  const rangeStart = React.useMemo(
    () => subWeeks(currentWeekStart, weeksCount - 1),
    [currentWeekStart, weeksCount],
  );
  const rangeEnd = React.useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart],
  );

  React.useEffect(() => {
    ensureChecklistsFetched({ from: rangeStart, to: rangeEnd });
  }, [ensureChecklistsFetched, rangeStart, rangeEnd]);

  return React.useMemo(
    () =>
      Array.from({ length: weeksCount }, (_, i) => {
        const weekStart = addWeeks(rangeStart, i);
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(date =>
          getDailyStat(getChecklistForDateWithoutFetching, date),
        );
        return { weekStart, weekEnd, ...summarize(days) };
      }),
    [rangeStart, weeksCount, getChecklistForDateWithoutFetching],
  );
};
