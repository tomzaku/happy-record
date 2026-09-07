// Unit tests for scheduleExceptions.ts — the id derivation, row mapping, and batch-keying logic
// behind a single "skip/move this date" override on a recurring schedule.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  deleteException,
  exceptionId,
  fetchExceptions,
  fetchExceptionsForSchedules,
  saveException,
  toScheduleException,
} from './scheduleExceptions.ts';
import { fakeSupabase } from './testSupport/fakeSupabase.ts';

Deno.test('exceptionId: deterministic from (scheduleId, date)', () => {
  assertEquals(exceptionId('ct:t1:owner', '2026-12-25'), 'ct:t1:owner:2026-12-25');
});

Deno.test('toScheduleException: omits overrideStartedAt entirely for a DELETED row', () => {
  const result = toScheduleException({
    exception_date: '2026-12-25',
    type: 'DELETED',
    override_started_at: null,
  });
  assertEquals(result, { date: '2026-12-25', type: 'DELETED' });
});

Deno.test('toScheduleException: carries overrideStartedAt through for a MODIFIED row', () => {
  const result = toScheduleException({
    exception_date: '2026-12-25',
    type: 'MODIFIED',
    override_started_at: '2026-12-26T09:30:00.000Z',
  });
  assertEquals(result, {
    date: '2026-12-25',
    type: 'MODIFIED',
    overrideStartedAt: '2026-12-26T09:30:00.000Z',
  });
});

Deno.test('fetchExceptions: maps every row for the schedule', async () => {
  const db = fakeSupabase({
    schedule_exceptions: [{
      data: [
        { exception_date: '2026-12-25', type: 'DELETED', override_started_at: null },
        { exception_date: '2026-01-01', type: 'DELETED', override_started_at: null },
      ],
      error: null,
    }],
  });
  const result = await fetchExceptions(db, 'ct:t1:owner');
  assertEquals(result.length, 2);
  assertEquals(result[0].date, '2026-12-25');
});

Deno.test('fetchExceptionsForSchedules: empty input never queries, returns empty', async () => {
  const db = fakeSupabase({});
  assertEquals(await fetchExceptionsForSchedules(db, []), {});
});

Deno.test('fetchExceptionsForSchedules: keys by schedule id, sorted by date within each', async () => {
  const db = fakeSupabase({
    schedule_exceptions: [{
      data: [
        { schedule_id: 'ct:t1:owner', exception_date: '2026-12-25', type: 'DELETED', override_started_at: null },
        { schedule_id: 'ct:t2:owner', exception_date: '2026-01-01', type: 'DELETED', override_started_at: null },
        { schedule_id: 'ct:t1:owner', exception_date: '2026-06-01', type: 'DELETED', override_started_at: null },
      ],
      error: null,
    }],
  });
  const result = await fetchExceptionsForSchedules(db, ['ct:t1:owner', 'ct:t2:owner']);
  assertEquals(result['ct:t1:owner'].map(e => e.date), ['2026-06-01', '2026-12-25']);
  assertEquals(result['ct:t2:owner'].map(e => e.date), ['2026-01-01']);
});

Deno.test('saveException: does not throw on a clean DELETED upsert', async () => {
  const db = fakeSupabase({ schedule_exceptions: [{ data: null, error: null }] });
  await saveException(db, 'ct:t1:owner', 'owner', { date: '2026-12-25', type: 'DELETED' });
});

Deno.test('saveException: does not throw on a clean MODIFIED upsert with an overrideStartedAt', async () => {
  const db = fakeSupabase({ schedule_exceptions: [{ data: null, error: null }] });
  await saveException(db, 'ct:t1:owner', 'owner', {
    date: '2026-12-25',
    type: 'MODIFIED',
    overrideStartedAt: '2026-12-26T09:00:00.000Z',
  });
});

Deno.test('deleteException: does not throw on a clean delete', async () => {
  const db = fakeSupabase({ schedule_exceptions: [{ data: null, error: null }] });
  await deleteException(db, 'ct:t1:owner', '2026-12-25');
});
