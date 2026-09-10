// Unit tests for scheduleExceptions.ts — the id derivation, row mapping, and batch-keying logic
// behind a single "skip/move this occurrence" override on a recurring schedule.

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

Deno.test('exceptionId: deterministic from (scheduleId, occurrenceStartedAt)', () => {
  assertEquals(
    exceptionId('ct:t1:owner', '2026-12-25T09:00:00.000Z'),
    'ct:t1:owner:2026-12-25T09:00:00.000Z',
  );
});

Deno.test('toScheduleException: omits overrideStartedAt/timezone entirely when unset', () => {
  const result = toScheduleException({
    occurrence_started_at: '2026-12-25T09:00:00.000Z',
    timezone: null,
    type: 'DELETED',
    override_started_at: null,
  });
  assertEquals(result, { occurrenceStartedAt: '2026-12-25T09:00:00.000Z', type: 'DELETED' });
});

Deno.test('toScheduleException: carries overrideStartedAt and timezone through for a MODIFIED row', () => {
  const result = toScheduleException({
    occurrence_started_at: '2026-12-25T09:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    type: 'MODIFIED',
    override_started_at: '2026-12-26T09:30:00.000Z',
  });
  assertEquals(result, {
    occurrenceStartedAt: '2026-12-25T09:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    type: 'MODIFIED',
    overrideStartedAt: '2026-12-26T09:30:00.000Z',
  });
});

Deno.test('fetchExceptions: maps every row for the schedule', async () => {
  const db = fakeSupabase({
    schedule_exceptions: [{
      data: [
        { occurrence_started_at: '2026-12-25T09:00:00.000Z', type: 'DELETED', override_started_at: null },
        { occurrence_started_at: '2026-01-01T09:00:00.000Z', type: 'DELETED', override_started_at: null },
      ],
      error: null,
    }],
  });
  const result = await fetchExceptions(db, 'ct:t1:owner');
  assertEquals(result.length, 2);
  assertEquals(result[0].occurrenceStartedAt, '2026-12-25T09:00:00.000Z');
});

Deno.test('fetchExceptionsForSchedules: empty input never queries, returns empty', async () => {
  const db = fakeSupabase({});
  assertEquals(await fetchExceptionsForSchedules(db, []), {});
});

Deno.test('fetchExceptionsForSchedules: keys by schedule id, sorted by occurrenceStartedAt within each', async () => {
  const db = fakeSupabase({
    schedule_exceptions: [{
      data: [
        { schedule_id: 'ct:t1:owner', occurrence_started_at: '2026-12-25T09:00:00.000Z', type: 'DELETED', override_started_at: null },
        { schedule_id: 'ct:t2:owner', occurrence_started_at: '2026-01-01T09:00:00.000Z', type: 'DELETED', override_started_at: null },
        { schedule_id: 'ct:t1:owner', occurrence_started_at: '2026-06-01T09:00:00.000Z', type: 'DELETED', override_started_at: null },
      ],
      error: null,
    }],
  });
  const result = await fetchExceptionsForSchedules(db, ['ct:t1:owner', 'ct:t2:owner']);
  assertEquals(result['ct:t1:owner'].map(e => e.occurrenceStartedAt), [
    '2026-06-01T09:00:00.000Z',
    '2026-12-25T09:00:00.000Z',
  ]);
  assertEquals(result['ct:t2:owner'].map(e => e.occurrenceStartedAt), ['2026-01-01T09:00:00.000Z']);
});

Deno.test('saveException: does not throw on a clean DELETED upsert', async () => {
  const db = fakeSupabase({ schedule_exceptions: [{ data: null, error: null }] });
  await saveException(db, 'ct:t1:owner', 'owner', {
    occurrenceStartedAt: '2026-12-25T09:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    type: 'DELETED',
  });
});

Deno.test('saveException: does not throw on a clean MODIFIED upsert with an overrideStartedAt', async () => {
  const db = fakeSupabase({ schedule_exceptions: [{ data: null, error: null }] });
  await saveException(db, 'ct:t1:owner', 'owner', {
    occurrenceStartedAt: '2026-12-25T09:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    type: 'MODIFIED',
    overrideStartedAt: '2026-12-26T09:00:00.000Z',
  });
});

Deno.test('deleteException: does not throw on a clean delete', async () => {
  const db = fakeSupabase({ schedule_exceptions: [{ data: null, error: null }] });
  await deleteException(db, 'ct:t1:owner', '2026-12-25T09:00:00.000Z');
});
