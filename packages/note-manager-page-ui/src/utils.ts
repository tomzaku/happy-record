import { isToday, isYesterday, isThisYear, format } from 'date-fns';

/** A note list row's own date label — "3:45 PM" for today, "Yesterday", the weekday name for
 * the last week, else a short date (plus year once it's not this year) — the same graduated
 * format macOS Notes' own list uses, rather than one fixed format for every row regardless of
 * age. */
export function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  const daysSince = (Date.now() - date.getTime()) / 86400000;
  if (daysSince < 6) return format(date, 'EEEE');
  return format(date, isThisYear(date) ? 'MMM d' : 'MMM d, yyyy');
}
