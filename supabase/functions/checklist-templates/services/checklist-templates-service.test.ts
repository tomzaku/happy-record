// Unit tests for `saveTemplate`/`deleteTemplate`'s `checklist_logs` guard — the existing-row check
// that keeps `updateChecklistTemplate`'s own "no local copy yet, fall back to a full POST" path
// (see useChecklistTemplates.tsx) from logging a real edit as a create, and keeps a repeat/no-op
// DELETE from logging a phantom delete (DELETE is idempotent — see CLAUDE.md). This is the one
// piece of the checklist-logs instrumentation worth real test coverage, since the guard is easy to
// silently regress.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { deleteTemplate, saveTemplate } from './checklist-templates-service.ts';
import { fakeSupabase, type FakeResponse } from '../../../shared/testSupport/fakeSupabase.ts';

/** Wraps `fakeSupabase` to also count how many times each table was queried, so a test can assert
 * "no checklist_logs insert was attempted" without needing that table's queue to error if hit. */
function countingDb(responses: Record<string, FakeResponse[]>) {
  const db = fakeSupabase(responses);
  const calls: Record<string, number> = {};
  const originalFrom = db.from.bind(db);
  db.from = (table: string) => {
    calls[table] = (calls[table] ?? 0) + 1;
    return originalFrom(table);
  };
  return { db, calls };
}

Deno.test('saveTemplate: logs a create when no row existed yet', async () => {
  const { db, calls } = countingDb({
    checklist_templates: [{ data: null, error: null }, { data: null, error: null }],
    repeats: [{ data: null, error: null }],
    checklist_logs: [{ data: null, error: null }],
  });
  await saveTemplate({ db, userId: 'u1' } as never, { id: 't1' }, undefined);
  assertEquals(calls.checklist_logs, 1);
});

Deno.test('saveTemplate: does not log when the row already existed (the edit fallback)', async () => {
  const { db, calls } = countingDb({
    checklist_templates: [{ data: { id: 't1', user_id: 'u1' }, error: null }, { data: null, error: null }],
    repeats: [{ data: null, error: null }],
  });
  await saveTemplate({ db, userId: 'u1' } as never, { id: 't1' }, undefined);
  assertEquals(calls.checklist_logs ?? 0, 0);
});

Deno.test('deleteTemplate: logs a delete for an existing own row', async () => {
  const { db, calls } = countingDb({
    checklist_templates: [{ data: { id: 't1', user_id: 'u1' }, error: null }, { data: null, error: null }],
    checklist_logs: [{ data: null, error: null }],
  });
  await deleteTemplate({ db, userId: 'u1' } as never, 't1');
  assertEquals(calls.checklist_logs, 1);
});

Deno.test('deleteTemplate: no-ops silently (no log) when the row is already gone', async () => {
  const { db, calls } = countingDb({
    checklist_templates: [{ data: null, error: null }, { data: null, error: null }],
  });
  await deleteTemplate({ db, userId: 'u1' } as never, 'nope');
  assertEquals(calls.checklist_logs ?? 0, 0);
});
