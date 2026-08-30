// Route table for the `checklist-records` resource. `/:id` is matched by `shared/router.ts`'s
// `matchRoute`.

import { listChecklistRecordsHandler } from './list-checklist-records-handler.ts';
import { saveChecklistRecordsHandler } from './save-checklist-records-handler.ts';
import { updateChecklistRecordHandler } from './update-checklist-record-handler.ts';
import { deleteChecklistRecordHandler } from './delete-checklist-record-handler.ts';
import type { Ctx } from './checklist-records-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listChecklistRecordsHandler,
  'POST /': saveChecklistRecordsHandler,
  'PATCH /:id': updateChecklistRecordHandler,
  'DELETE /:id': deleteChecklistRecordHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('checklist-records');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
