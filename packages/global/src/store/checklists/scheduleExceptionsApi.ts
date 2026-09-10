// Client for the `schedule-exceptions` resource — a single-occurrence override on top of an
// otherwise-recurring checklist template, Google Calendar's "delete this event"/"this event only"
// edit for one occurrence of a series. See CLAUDE.md. Quiet throughout — same "don't error, just
// don't persist" convention every other resource here follows.
//
// Checklist-template schedules only today (no `fieldGroupId` support) — see the edge function's
// own `index.ts` comment on why.
//
// Every call here identifies the occurrence by its own full `occurrenceStartedAt` instant, not a
// bare calendar day — a schedule that ever recurs more than once a day would otherwise collide
// every one of that day's occurrences onto the same key (see the `schedule_exceptions` table's
// own migration for the full reasoning). `getClientTimezone()` rides along on every write so the
// server can recover the right *local* day this occurrence fell on when it hands `exceptionDates`/
// `modifiedOccurrences` back (schedules.ts's own `toRepeat`).

import { request } from '../../lib/api';
import { getClientTimezone } from '../../util';

/** `:id` is `<checklistTemplateId>:<occurrenceStartedAt>`, not the underlying `schedules`/
 * `schedule_exceptions` row id — the server derives that from the caller's own session (see the
 * edge function's own comment on why a client-supplied version of the real id would be unsafe to
 * trust). */
const compositeId = (checklistTemplateId: string, occurrenceStartedAt: string) =>
  `${checklistTemplateId}:${occurrenceStartedAt}`;

/** Skips one occurrence — `occurrenceStartedAt` is the exact moment (a full ISO instant, e.g. a
 * `Checklist.startedAt`) this template's schedule would otherwise have generated it at. */
export function deleteOccurrence(checklistTemplateId: string, occurrenceStartedAt: string): Promise<{ ok: true } | null> {
  return request.post(
    '/schedule-exceptions',
    { checklistTemplateId, occurrenceStartedAt, type: 'DELETED', timezone: getClientTimezone() },
    { quiet: true },
  );
}

/** Restores a previously-skipped or previously-modified occurrence to its normal, unmodified
 * schedule — idempotent, same as every other DELETE route here. */
export function restoreOccurrence(checklistTemplateId: string, occurrenceStartedAt: string): Promise<{ ok: true } | null> {
  return request.delete(
    `/schedule-exceptions/${encodeURIComponent(compositeId(checklistTemplateId, occurrenceStartedAt))}`,
    { quiet: true },
  );
}

/** Overrides one occurrence's own start moment without touching the rest of the series —
 * Google Calendar's "this event" edit scope. `occurrenceStartedAt` is the occurrence being edited
 * (its normal, unmodified moment); `overrideStartedAt` is the new moment, also a full ISO instant. */
export function modifyOccurrence(
  checklistTemplateId: string,
  occurrenceStartedAt: string,
  overrideStartedAt: string,
): Promise<{ ok: true } | null> {
  return request.post(
    '/schedule-exceptions',
    { checklistTemplateId, occurrenceStartedAt, type: 'MODIFIED', overrideStartedAt, timezone: getClientTimezone() },
    { quiet: true },
  );
}
