// Client for the `schedule-exceptions` resource — a single calendar-day skip on top of an
// otherwise-recurring checklist template, Google Calendar's "delete this event" for one
// occurrence of a series. See CLAUDE.md. Quiet throughout — same "don't error, just don't persist"
// convention every other resource here follows.
//
// Checklist-template schedules only today (no `fieldGroupId` support) — see the edge function's
// own `index.ts` comment on why.

import { request } from '../../lib/api';

/** `:id` is `<checklistTemplateId>:<date>`, not the underlying `schedules`/`schedule_exceptions`
 * row id — the server derives that from the caller's own session (see the edge function's own
 * comment on why a client-supplied version of the real id would be unsafe to trust). */
const compositeId = (checklistTemplateId: string, date: string) => `${checklistTemplateId}:${date}`;

/** Skips one occurrence — `date` is the calendar day (`YYYY-MM-DD`) this template's schedule would
 * otherwise have matched. */
export function deleteOccurrence(checklistTemplateId: string, date: string): Promise<{ ok: true } | null> {
  return request.post(
    '/schedule-exceptions',
    { checklistTemplateId, date, type: 'DELETED' },
    { quiet: true },
  );
}

/** Restores a previously-skipped occurrence — idempotent, same as every other DELETE route here. */
export function restoreOccurrence(checklistTemplateId: string, date: string): Promise<{ ok: true } | null> {
  return request.delete(
    `/schedule-exceptions/${encodeURIComponent(compositeId(checklistTemplateId, date))}`,
    { quiet: true },
  );
}
