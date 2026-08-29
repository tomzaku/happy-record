import { isToday, isYesterday, isThisYear, differenceInCalendarDays, format } from 'date-fns';
import type { Note } from '@dreamer/global/src/store/note/useNote';

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

/** Which section header a note falls under in the list — the same graduated buckets macOS
 * Notes' own list uses: Today, Yesterday, Previous 7 Days, Previous 30 Days, then a bare month
 * name for anything older but still this year (most recent month first), then "Month Year" once
 * it's not. Grouped by `updatedAt` (last-edited), matching what the list itself sorts by and
 * what Apple Notes' own grouping is actually keyed on, not `createdAt`. */
function dateBucketOf(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const daysAgo = differenceInCalendarDays(now, date);
  if (daysAgo <= 7) return 'Previous 7 Days';
  if (daysAgo <= 30) return 'Previous 30 Days';
  return isThisYear(date) ? format(date, 'MMMM') : format(date, 'MMMM yyyy');
}

export type NoteDateGroup = { label: string; notes: Note[] };

/** Splits an already most-recently-updated-first list into macOS-Notes-style date sections —
 * `notes.map(dateBucketOf)` is monotonically non-decreasing in "how long ago" as the input walks
 * from newest to oldest, so a bucket, once left, is never revisited; grouping just needs to
 * notice when the label changes, not a full group-by over the whole array. */
export function groupNotesByDate(notes: Note[]): NoteDateGroup[] {
  const groups: NoteDateGroup[] = [];
  for (const note of notes) {
    const label = dateBucketOf(note.updatedAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.notes.push(note);
    else groups.push({ label, notes: [note] });
  }
  return groups;
}
