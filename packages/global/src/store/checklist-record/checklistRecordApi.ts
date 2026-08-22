// Client for the `checklist-records` resource — what "Submit" writes on
// detail-task-page, and the hot path for its history/chart reads. See
// CLAUDE.md. Quiet throughout — useChecklistRecord.ts's own
// useLocalStorage state is the fallback.

import { request } from '../../lib/api';
import type { ChecklistRecord } from './useChecklistRecord';

/**
 * Records for this user, newest first. `checklistTemplateId` omitted reads
 * across every template — packages/global/src/store/note/useNoteRecord.tsx
 * does this, since notes are checklist records under the hood too.
 */
export function fetchChecklistRecords(opts: {
  checklistTemplateId?: string;
  from?: string;
  to?: string;
  fieldIds?: string[];
  limit?: number;
} = {}): Promise<{ records: ChecklistRecord[] } | null> {
  return request.get('/checklist-records', {
    quiet: true,
    params: {
      checklistTemplateId: opts.checklistTemplateId,
      from: opts.from,
      to: opts.to,
      fieldIds: opts.fieldIds?.length ? opts.fieldIds.join(',') : undefined,
      limit: opts.limit,
    },
  });
}

/**
 * One submit's worth of fields, already carrying the ids `addChecklistRecord`
 * assigned locally — including `submissionId`, the one id shared by every
 * field in this batch (one per Submit click, not per field). That's the
 * real "these were committed together" relationship server-side, not
 * `createdAt` matching.
 */
export function saveChecklistRecords(data: {
  records: ChecklistRecord[];
  checklistId: string;
  checklistTemplateId: string;
  createdAt: string;
  submissionId: string;
}): Promise<{ ok: true } | null> {
  return request.post('/checklist-records', data, { quiet: true });
}

export function updateChecklistRecordValue(
  id: string,
  data: { value: number | string; folderId?: string },
): Promise<{ ok: true } | null> {
  return request.patch('/checklist-records', { id, ...data }, { quiet: true });
}

export function removeChecklistRecord(id: string): Promise<{ ok: true } | null> {
  return request.delete('/checklist-records', { quiet: true, params: { id } });
}
