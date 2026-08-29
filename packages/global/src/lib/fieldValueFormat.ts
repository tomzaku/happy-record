// Conversions between the full ISO 8601 timestamp a `date`/`datetime`-type field's own value is
// always stored as (server-side and client-side alike — see
// 20260829070000_field_types_text_date.sql and CLAUDE.md: never truncated to a bare date string)
// and the native `<input type="date">`/`<input type="datetime-local">` value formats those
// controls actually read/write, which carry no timezone info at all — a bare `YYYY-MM-DD` or
// `YYYY-MM-DDTHH:mm`, always interpreted as the browser's own local time. Every date/datetime
// field editor in the app (ChecklistFieldGeneral, ChecklistFieldGroupAdd) goes through this one
// module instead of re-deriving the round trip.
//
// The conversion has to go through local date/time parts explicitly, not
// `new Date(inputValue).toISOString()` directly on the bare native-input string: `Date.parse`
// treats a date-only string (`YYYY-MM-DD`, no time component) as UTC midnight but a
// date-*time* string (`YYYY-MM-DDTHH:mm`) as local time — inconsistent with each other, and with
// @moon-ui/date-picker's own `dateToInputValue`, which reads the stored value back out via local
// `getFullYear`/`getMonth`/`getDate`. Building the `Date` from local parts on the way in, and
// reading local parts back out on the way out, is what keeps the calendar day/wall-clock time the
// user actually picked from drifting by a day (or an hour) around that UTC/local seam.

const pad = (n: number): string => String(n).padStart(2, '0');

/** `<input type="date">`'s own `onChange` value (`YYYY-MM-DD`) → a full ISO timestamp, local
 * midnight on that day. */
export function dateInputValueToIso(value: string): string | undefined {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d).toISOString();
}

/** `<input type="datetime-local">`'s own `onChange` value (`YYYY-MM-DDTHH:mm`) → a full ISO
 * timestamp, at that local wall-clock moment. */
export function datetimeLocalInputValueToIso(value: string): string | undefined {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** The reverse of `datetimeLocalInputValueToIso` — a stored ISO timestamp → what
 * `<input type="datetime-local">`'s own `value` prop expects. (`date`-type fields don't need the
 * equivalent here: @moon-ui/date-picker already does this conversion internally.) */
export function isoToDatetimeLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Read-only display — History, the collapsed (non-editing) state of a field row. `text` is
 * itself already display-ready; `date`/`datetime` format the stored ISO timestamp down to what a
 * human actually wants to see (just the day, or the day plus a locale-formatted time) rather than
 * the raw ISO string. Tolerant of a value that isn't real date content (not yet a valid Date) —
 * falls back to the raw string rather than showing "Invalid Date". */
export function formatFieldValueForDisplay(
  type: 'text' | 'date' | 'datetime',
  value: unknown,
): string {
  const raw = value == null ? '' : String(value);
  if (type === 'text') return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  if (type === 'date') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return d.toLocaleString();
}
