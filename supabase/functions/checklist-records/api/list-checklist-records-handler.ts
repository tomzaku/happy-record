// `GET /checklist-records` — always the caller's own, nothing to compose a `checkPermission`
// around. A challenge dashboard's own peer-read of *other* participants' checklist_records
// happens in `challenges/index.ts`, on its own explicit query — not here.

import { limitOf, toChecklistRecord } from '../../../dto/checklist-records/checklist-records-dto.ts';
import { listChecklistRecords } from '../services/checklist-records-service.ts';
import type { Ctx } from './checklist-records-context.ts';

const DEFAULT_PAGE = 1000;

export async function listChecklistRecordsHandler(ctx: Ctx) {
  const { url } = ctx;
  const templateId = url.searchParams.get('checklistTemplateId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fieldIds = (url.searchParams.get('fieldIds') ?? '').split(',').filter(Boolean);
  const limit = limitOf(url.searchParams.get('limit'), DEFAULT_PAGE);

  const { rows, notesById } = await listChecklistRecords(ctx, { templateId, from, to, fieldIds, limit });

  const records = rows.map(r =>
    toChecklistRecord(r, typeof r.note_id === 'string' ? notesById.get(r.note_id) : undefined),
  );
  return { records };
}
