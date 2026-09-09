// Unit tests for checklists-service.ts's saveChecklist — specifically the natural-key resolution
// that keeps a client-generated id drifting from what's already on file for the same
// (user, template, day) slot from upserting a second row into it and hitting
// `idx_checklists_user_template_started_unique` as a raw, uncaught constraint violation (a real
// live 500 this was reproducing against the remote DB before this fix — see that migration's own
// comment on the index).

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { saveChecklist } from './checklists-service.ts';

// A capturing stub, not the shared `fakeSupabase` — this test asserts on what `upsertChecklist`
// was actually called with, which the shared fake never records. `.limit()` and `.maybeSingle()`
// are distinguished by method name (matching `fetchChecklistById`'s vs `fetchChecklistBySlot`'s
// own chain shape), not call order, so each can return its own canned result regardless of which
// runs first.
// deno-lint-ignore no-explicit-any
function capturingDb(slotMatch: { id: string } | null, byIdMatch: Record<string, unknown> | null) {
  const upserts: Record<string, unknown>[] = [];
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    limit: () => Promise.resolve({ data: byIdMatch ? [byIdMatch] : [], error: null }),
    maybeSingle: () => Promise.resolve({ data: slotMatch, error: null }),
    upsert: (row: Record<string, unknown>) => {
      upserts.push(row);
      return Promise.resolve({ error: null });
    },
    insert: () => Promise.resolve({ error: null }),
  };
  return { from: () => builder, upserts };
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
  const db = capturingDb({ id: 'existing-row-id' }, null);
  await saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow });
  assertEquals(db.upserts.length, 1);
  assertEquals(db.upserts[0].id, 'existing-row-id');
});

Deno.test('saveChecklist: keeps the client-supplied id when no other row already occupies that slot', async () => {
  const db = capturingDb(null, null);
  await saveChecklist({ db, userId: 'user-1' } as never, { ...baseRow });
  assertEquals(db.upserts.length, 1);
  assertEquals(db.upserts[0].id, 'fresh-client-id');
});
