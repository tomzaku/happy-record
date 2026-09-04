// `recordChecklistLog` must never throw — the write it's attached to has already committed by the
// time it runs, so a logging failure has nothing to roll back and must not surface as an error to
// whichever resource called it.

import { recordChecklistLog } from './checklistLogs.ts';
import { fakeSupabase } from './testSupport/fakeSupabase.ts';

Deno.test('recordChecklistLog: swallows an insert failure rather than throwing', async () => {
  const db = fakeSupabase({ checklist_logs: [{ data: null, error: { message: 'boom' } }] });
  await recordChecklistLog(db, 'u1', { checklistTemplateId: 't1', action: 'create' });
});

Deno.test('recordChecklistLog: resolves cleanly on success', async () => {
  const db = fakeSupabase({ checklist_logs: [{ data: null, error: null }] });
  await recordChecklistLog(db, 'u1', { checklistTemplateId: 't1', action: 'create' });
});
