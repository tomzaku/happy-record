// Unit tests for checklists-service.ts's saveChecklist:
// - the natural-key resolution that keeps a client-generated id drifting from what's already on
//   file for the same (user, template, day) slot from upserting a second row into it and hitting
//   `idx_checklists_user_template_started_unique` as a raw, uncaught constraint violation (a real
//   live 500 this was reproducing against the remote DB before this fix — see that migration's
//   own comment on the index).
// - the fresh-occurrence resolution: a row with no `ended_date` (the client knows *which* real
//   `started_at` it wants — see occurrenceSeed in useChecklists.tsx — but not the template's own
//   `duration`) gets it filled in from the template's schedule, after confirming `started_at` is
//   actually a real occurrence of it (`occurrenceDayMatches` — rejects the exact class of bug,
//   "today" sent regardless of which day was actually being viewed, behind a real live report).

import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { saveChecklist } from './checklists-service.ts';
import { ApiError } from '../../../shared/cors.ts';

// A capturing stub, not the shared `fakeSupabase` — this test asserts on what `upsertChecklist`
// was actually called with, which the shared fake never records. Routed by table name (not call
// order), so `checklists`' own `.limit()`/`.maybeSingle()` chains and `schedules`' own
// `.maybeSingle()` chain (fetchRepeatRow) each get their own canned result independent of which
// runs first.
// deno-lint-ignore no-explicit-any
function capturingDb(opts: {
  slotMatch?: { id: string } | null;
  byIdMatch?: Record<string, unknown> | null;
  scheduleRow?: Record<string, unknown> | null;
}) {
  const upserts: Record<string, unknown>[] = [];
  const checklistsBuilder: any = {
    select: () => checklistsBuilder,
    eq: () => checklistsBuilder,
    limit: () => Promise.resolve({ data: opts.byIdMatch ? [opts.byIdMatch] : [], error: null }),
    maybeSingle: () => Promise.resolve({ data: opts.slotMatch ?? null, error: null }),
    upsert: (row: Record<string, unknown>) => {
      upserts.push(row);
      return Promise.resolve({ error: null });
    },
  };
  const schedulesBuilder: any = {
    select: () => schedulesBuilder,
    eq: () => schedulesBuilder,
    maybeSingle: () => Promise.resolve({ data: opts.scheduleRow ?? null, error: null }),
  };
  const checklistLogsBuilder: any = {
    insert: () => Promise.resolve({ error: null }),
  };
  const tables: Record<string, any> = {
    checklists: checklistsBuilder,
    schedules: schedulesBuilder,
    checklist_logs: checklistLogsBuilder,
  };
  return { from: (table: string) => tables[table], upserts };
}

const baseRow = {
  id: 'fresh-client-id',
  checklist_template_id: 'template-a',
  title: 'Task',
  started_at: '2026-09-08T17:00:00.000Z',
  ended_date: null,
  completed_at: null,
  updated_at: '2026-09-09T00:00:00.000Z',
};

Deno.test("saveChecklist: reuses the existing row's id when a different id targets the same (user, template, day) slot", async () => {
  // `ended_date: null` here means the row *is* eligible for schedule resolution, but no
  // `scheduleRow` (an unscheduled/one-off template) skips it — this test is purely about slot
  // dedup, not resolution, so `ended_date` stays whatever `baseRow` already has.
  const db = capturingDb({ slotMatch: { id: 'existing-row-id' } });
  await saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow });
  assertEquals(db.upserts.length, 1);
  assertEquals(db.upserts[0].id, 'existing-row-id');
});

Deno.test('saveChecklist: keeps the client-supplied id when no other row already occupies that slot', async () => {
  const db = capturingDb({});
  await saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow });
  assertEquals(db.upserts.length, 1);
  assertEquals(db.upserts[0].id, 'fresh-client-id');
});

Deno.test("saveChecklist: a fresh occurrence (no ended_date) resolves it from the template's own timed schedule", async () => {
  const db = capturingDb({
    scheduleRow: { byday: 'WE', started_at: '2026-09-08T17:00:00.000Z', timezone: 'Asia/Saigon', duration: 180 * 60000 },
  });
  await saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow, ended_date: null });
  assertEquals(db.upserts.length, 1);
  assertEquals(db.upserts[0].started_at, baseRow.started_at);
  assertEquals(db.upserts[0].ended_date, '2026-09-08T20:00:00.000Z');
});

Deno.test('saveChecklist: rejects a started_at the schedule does not actually recur on', async () => {
  const db = capturingDb({
    // Wednesdays only — baseRow.started_at is a Wednesday (see occurrenceDayMatches' own test
    // coverage in schedules.test.ts), so pick a schedule that only recurs on a *different* day.
    scheduleRow: { byday: 'TH', started_at: '2026-09-09T17:00:00.000Z', timezone: 'Asia/Saigon', duration: 180 * 60000 },
  });
  await assertRejects(
    () => saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow, ended_date: null }),
    ApiError,
  );
  assertEquals(db.upserts.length, 0);
});

Deno.test('saveChecklist: no schedule at all (a one-off task) leaves ended_date null rather than resolving anything', async () => {
  const db = capturingDb({ scheduleRow: null });
  await saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow, ended_date: null });
  assertEquals(db.upserts[0].ended_date, null);
});

Deno.test('saveChecklist: an explicit ended_date (a direct edit) is never overwritten, even with a matching schedule', async () => {
  const db = capturingDb({
    scheduleRow: { byday: 'WE', started_at: '2026-09-08T17:00:00.000Z', timezone: 'Asia/Saigon', duration: 180 * 60000 },
  });
  await saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow, ended_date: '2026-09-09T00:00:00.000Z' });
  assertEquals(db.upserts[0].ended_date, '2026-09-09T00:00:00.000Z');
});
