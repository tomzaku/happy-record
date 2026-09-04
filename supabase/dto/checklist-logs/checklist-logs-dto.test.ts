import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fromChecklistLogEntry, toChecklistLog } from './checklist-logs-dto.ts';

Deno.test('fromChecklistLogEntry: defaults checklistId/detail/metadata to null when absent', () => {
  const row = fromChecklistLogEntry({ checklistTemplateId: 't1', action: 'create' }, 'u1');
  assertEquals(row.user_id, 'u1');
  assertEquals(row.checklist_template_id, 't1');
  assertEquals(row.checklist_id, null);
  assertEquals(row.detail, null);
  assertEquals(row.metadata, null);
  assertEquals(typeof row.id, 'string');
});

Deno.test('fromChecklistLogEntry: carries checklistId/detail/metadata through when present', () => {
  const row = fromChecklistLogEntry(
    { checklistTemplateId: 't1', checklistId: 'c1', action: 'update', detail: 'submitted', metadata: { submissionId: 's1' } },
    'u1',
  );
  assertEquals(row.checklist_id, 'c1');
  assertEquals(row.detail, 'submitted');
  assertEquals(row.metadata, { submissionId: 's1' });
});

Deno.test('toChecklistLog: omits checklistId/detail/metadata entirely when null, rather than sending null', () => {
  const log = toChecklistLog({
    id: 'l1',
    checklist_template_id: 't1',
    checklist_id: null,
    action: 'create',
    detail: null,
    metadata: null,
    created_at: '2026-09-01T00:00:00.000Z',
  });
  assertEquals('checklistId' in log, false);
  assertEquals('detail' in log, false);
  assertEquals('metadata' in log, false);
});

Deno.test('toChecklistLog: includes checklistId/detail/metadata when present', () => {
  const log = toChecklistLog({
    id: 'l1',
    checklist_template_id: 't1',
    checklist_id: 'c1',
    action: 'update',
    detail: 'completed',
    metadata: { foo: 'bar' },
    created_at: '2026-09-01T00:00:00.000Z',
  });
  assertEquals(log.checklistId, 'c1');
  assertEquals(log.detail, 'completed');
  assertEquals(log.metadata, { foo: 'bar' });
});
