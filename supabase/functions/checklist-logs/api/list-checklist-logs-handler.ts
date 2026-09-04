// `GET /checklist-logs` — always the caller's own, a plain explicit filter with nothing to
// compose a `checkPermission` around.

import { toChecklistLog } from '../../../dto/checklist-logs/checklist-logs-dto.ts';
import { listChecklistLogs } from '../services/checklist-logs-service.ts';
import { actionsFrom, limitFrom, type Ctx } from './checklist-logs-context.ts';

export async function listChecklistLogsHandler(ctx: Ctx) {
  const checklistTemplateId = ctx.url.searchParams.get('checklistTemplateId') || undefined;
  const actions = actionsFrom(ctx.url);
  const limit = limitFrom(ctx.url, 50, 200);

  const rows = await listChecklistLogs(ctx, { checklistTemplateId, actions, limit });
  return { checklistLogs: rows.map(toChecklistLog) };
}
