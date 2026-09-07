// Row mapping + queries for `schedule_exceptions` (20260907010000_schedule_exceptions_table.sql)
// — a single calendar-day override on top of an otherwise-recurring `schedules` row ("skip this
// one holiday" without touching the recurrence rule itself). See that migration's own header for
// why this is a separate table rather than a jsonb column on `schedules`, and why
// `override_started_at` is a real typed column (one timestamptz, matching `schedules.started_at`'s
// own shape) rather than a jsonb blob or a separate date/hour/minute split.
//
// No dedicated resource/edge function yet, same as `schedules` itself (see schedules.ts's own
// header) — nothing calls these outside this file's own tests today. `type: 'MODIFIED'` is
// accepted and stored (`overrideStartedAt`) but nothing reads it back yet; only `DELETED` has real
// behavior once something wires this into occurrence matching (rruleUtils.ts's EXDATE support).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Row = Record<string, unknown>;
export type ExceptionType = 'DELETED' | 'MODIFIED';

export type ScheduleException = {
  date: string;
  type: ExceptionType;
  overrideStartedAt?: string;
};

// Deterministic, not freshly generated — one exception per (schedule, day) is the whole point of
// this table (the migration's own unique constraint backs the same rule), so the id is derivable
// rather than looked up, same reasoning schedules.ts's own `rowId` already uses.
export function exceptionId(scheduleId: string, date: string): string {
  return `${scheduleId}:${date}`;
}

export function toScheduleException(row: Row): ScheduleException {
  return {
    date: row.exception_date as string,
    type: row.type as ExceptionType,
    ...(row.override_started_at != null ? { overrideStartedAt: row.override_started_at as string } : {}),
  };
}

export async function fetchExceptions(db: SupabaseClient, scheduleId: string): Promise<ScheduleException[]> {
  const { data, error } = await db
    .from('schedule_exceptions')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('exception_date', { ascending: true });
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
  for (const list of Object.values(bySchedule)) list.sort((a, b) => a.date.localeCompare(b.date));
  return bySchedule;
}

/** Upserts one exception date on a schedule the caller already owns (or has confirmed permission
 * for — this function does no authorization of its own, same as schedules.ts's `saveRepeat`).
 * `override_started_at` is only ever set for a `MODIFIED` row — the migration's own CHECK enforces
 * that, this just mirrors it so a bad call fails at the DB, not silently. */
export async function saveException(
  db: SupabaseClient,
  scheduleId: string,
  userId: string,
  exception: { date: string; type: ExceptionType; overrideStartedAt?: string },
): Promise<void> {
  const { error } = await db.from('schedule_exceptions').upsert({
    id: exceptionId(scheduleId, exception.date),
    schedule_id: scheduleId,
    user_id: userId,
    exception_date: exception.date,
    type: exception.type,
    override_started_at: exception.type === 'MODIFIED' ? (exception.overrideStartedAt ?? null) : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Removes one exception date, restoring the recurrence's normal occurrence on that day. Deleting
 * what isn't there is a no-op, not an error — same idempotent-delete convention every resource in
 * this app follows for its own DELETE route. */
export async function deleteException(db: SupabaseClient, scheduleId: string, date: string): Promise<void> {
  const { error } = await db.from('schedule_exceptions').delete().eq('id', exceptionId(scheduleId, date));
  if (error) throw new Error(error.message);
}
