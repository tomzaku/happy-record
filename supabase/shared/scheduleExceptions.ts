// Row mapping + queries for `schedule_exceptions` (20260907010000_schedule_exceptions_table.sql)
// — a single-occurrence override on top of an otherwise-recurring `schedules` row ("skip this one
// holiday" without touching the recurrence rule itself). See that migration's own header for why
// this is a separate table rather than a jsonb column on `schedules`, why `occurrence_started_at`
// is a full instant rather than a plain `date` (a schedule producing more than one occurrence a
// day would otherwise collide), and why `override_started_at` is a real typed column (one
// timestamptz, matching `schedules.started_at`'s own shape) rather than a jsonb blob or a separate
// date/hour/minute split.
//
// Served by the `schedule-exceptions` edge function (`supabase/functions/schedule-exceptions/`).
// `type: 'DELETED'` skips the occurrence entirely (rruleUtils.ts's EXDATE-style `exceptionDates`);
// `type: 'MODIFIED'` keeps the occurrence but overrides its own start moment
// (`overrideStartedAt`) — schedules.ts's `toRepeat` converts both back into the *day*-keyed shape
// the client actually consumes (`repeat.exceptionDates`/`repeat.modifiedOccurrences`), reading
// `occurrenceStartedAt` through `timezone` (`calendarDayIn` in `rruleUtils.ts`) to recover the
// right local calendar day — every schedule this app builds today still only ever produces one
// occurrence per day, so that day-keyed shape stays exactly right for every current consumer.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Row = Record<string, unknown>;
export type ExceptionType = 'DELETED' | 'MODIFIED';

export type ScheduleException = {
  /** The occurrence being excepted, as the schedule's own recurrence rule would naturally have
   * generated it — never the new moment for a `MODIFIED` row (that's `overrideStartedAt`). */
  occurrenceStartedAt: string;
  /** The zone `occurrenceStartedAt` (and, for a `MODIFIED` row, `overrideStartedAt`) was picked
   * in — absent for an exception saved before this existed. */
  timezone?: string;
  type: ExceptionType;
  overrideStartedAt?: string;
};

// Deterministic, not freshly generated — one exception per (schedule, occurrence) is the whole
// point of this table (the migration's own unique constraint backs the same rule), so the id is
// derivable rather than looked up, same reasoning schedules.ts's own `rowId` already uses.
export function exceptionId(scheduleId: string, occurrenceStartedAt: string): string {
  return `${scheduleId}:${occurrenceStartedAt}`;
}

export function toScheduleException(row: Row): ScheduleException {
  return {
    occurrenceStartedAt: row.occurrence_started_at as string,
    ...(row.timezone ? { timezone: row.timezone as string } : {}),
    type: row.type as ExceptionType,
    ...(row.override_started_at != null ? { overrideStartedAt: row.override_started_at as string } : {}),
  };
}

export async function fetchExceptions(db: SupabaseClient, scheduleId: string): Promise<ScheduleException[]> {
  const { data, error } = await db
    .from('schedule_exceptions')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('occurrence_started_at', { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toScheduleException);
}

/** Batch form of `fetchExceptions`, mirroring schedules.ts's own `fetchRepeats` batch shape —
 * every exception for a batch of schedule ids at once, keyed by schedule id, so a list() route
 * that already batches `schedules` reads can batch this alongside it rather than one query per row. */
export async function fetchExceptionsForSchedules(
  db: SupabaseClient,
  scheduleIds: string[],
): Promise<Record<string, ScheduleException[]>> {
  const bySchedule: Record<string, ScheduleException[]> = {};
  if (!scheduleIds.length) return bySchedule;

  const { data, error } = await db.from('schedule_exceptions').select('*').in('schedule_id', scheduleIds);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as Row[]) {
    const key = row.schedule_id as string;
    (bySchedule[key] ??= []).push(toScheduleException(row));
  }
  for (const list of Object.values(bySchedule)) {
    list.sort((a, b) => a.occurrenceStartedAt.localeCompare(b.occurrenceStartedAt));
  }
  return bySchedule;
}

/** Upserts one exception on a schedule the caller already owns (or has confirmed permission for —
 * this function does no authorization of its own, same as schedules.ts's `saveRepeat`).
 * `override_started_at` is only ever set for a `MODIFIED` row — the migration's own CHECK enforces
 * that, this just mirrors it so a bad call fails at the DB, not silently. */
export async function saveException(
  db: SupabaseClient,
  scheduleId: string,
  userId: string,
  exception: { occurrenceStartedAt: string; timezone?: string; type: ExceptionType; overrideStartedAt?: string },
): Promise<void> {
  const { error } = await db.from('schedule_exceptions').upsert({
    id: exceptionId(scheduleId, exception.occurrenceStartedAt),
    schedule_id: scheduleId,
    user_id: userId,
    occurrence_started_at: exception.occurrenceStartedAt,
    timezone: exception.timezone ?? null,
    type: exception.type,
    override_started_at: exception.type === 'MODIFIED' ? (exception.overrideStartedAt ?? null) : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Removes one exception, restoring the recurrence's normal occurrence. Deleting what isn't there
 * is a no-op, not an error — same idempotent-delete convention every resource in this app follows
 * for its own DELETE route. */
export async function deleteException(db: SupabaseClient, scheduleId: string, occurrenceStartedAt: string): Promise<void> {
  const { error } = await db.from('schedule_exceptions').delete().eq('id', exceptionId(scheduleId, occurrenceStartedAt));
  if (error) throw new Error(error.message);
}
