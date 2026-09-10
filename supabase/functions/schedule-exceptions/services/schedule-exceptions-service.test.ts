// Unit tests for schedule-exceptions-service.ts — the one thing this thin layer actually does:
// derive the real `schedules` row id from `ctx.userId`, never trust one from the client. See
// index.ts's own comment on why that matters (a client-supplied composite id would let a caller
// address another user's row by constructing the right string).

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { saveScheduleException, deleteScheduleException } from './schedule-exceptions-service.ts';

// A tiny capturing stub, not the shared `fakeSupabase` — that one hands back canned responses
// without recording what it was called with, and the whole point of these tests is asserting on
// the arguments `saveException`/`deleteException` (shared/scheduleExceptions.ts) were actually
// called with.
// deno-lint-ignore no-explicit-any
function capturingDb() {
  const upserts: Record<string, unknown>[] = [];
  const eqCalls: [string, unknown][] = [];
  const builder: any = {
    upsert: (row: Record<string, unknown>) => {
      upserts.push(row);
      return Promise.resolve({ error: null });
    },
    delete: () => builder,
    eq: (col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return Promise.resolve({ error: null });
    },
  };
  return { from: () => builder, upserts, eqCalls };
}

Deno.test('saveScheduleException: derives schedule_id from ctx.userId, not any client-supplied value', async () => {
  const db = capturingDb();
  await saveScheduleException(
    { db, userId: 'caller-1' } as never,
    { checklistTemplateId: 'template-a', occurrenceStartedAt: '2026-09-08T08:00:00.000Z', type: 'DELETED' },
  );
  assertEquals(db.upserts.length, 1);
  assertEquals(db.upserts[0].schedule_id, 'ct:template-a:caller-1');
  assertEquals(db.upserts[0].user_id, 'caller-1');
  assertEquals(db.upserts[0].id, 'ct:template-a:caller-1:2026-09-08T08:00:00.000Z');
});

Deno.test('saveScheduleException: two different callers against the same template id land on two different rows', async () => {
  const db = capturingDb();
  await saveScheduleException(
    { db, userId: 'caller-1' } as never,
    { checklistTemplateId: 'shared-template', occurrenceStartedAt: '2026-09-08T08:00:00.000Z', type: 'DELETED' },
  );
  await saveScheduleException(
    { db, userId: 'caller-2' } as never,
    { checklistTemplateId: 'shared-template', occurrenceStartedAt: '2026-09-08T08:00:00.000Z', type: 'DELETED' },
  );
  assertEquals(db.upserts[0].schedule_id, 'ct:shared-template:caller-1');
  assertEquals(db.upserts[1].schedule_id, 'ct:shared-template:caller-2');
});

Deno.test('saveScheduleException: MODIFIED forwards overrideStartedAt and timezone onto the row', async () => {
  const db = capturingDb();
  await saveScheduleException(
    { db, userId: 'caller-1' } as never,
    {
      checklistTemplateId: 'template-a',
      occurrenceStartedAt: '2026-09-08T08:00:00.000Z',
      type: 'MODIFIED',
      timezone: 'Asia/Ho_Chi_Minh',
      overrideStartedAt: '2026-09-08T09:30:00.000Z',
    },
  );
  assertEquals(db.upserts.length, 1);
  assertEquals(db.upserts[0].type, 'MODIFIED');
  assertEquals(db.upserts[0].timezone, 'Asia/Ho_Chi_Minh');
  assertEquals(db.upserts[0].override_started_at, '2026-09-08T09:30:00.000Z');
});

Deno.test('deleteScheduleException: derives the same schedule_id shape, scoped to ctx.userId', async () => {
  const db = capturingDb();
  await deleteScheduleException(
    { db, userId: 'caller-1' } as never,
    { checklistTemplateId: 'template-a', occurrenceStartedAt: '2026-09-08T08:00:00.000Z' },
  );
  assertEquals(db.eqCalls, [['id', 'ct:template-a:caller-1:2026-09-08T08:00:00.000Z']]);
});
