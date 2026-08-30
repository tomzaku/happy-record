// `GET /checklists/:id` — the shape `detail-task-page` needs: it already knows the exact
// checklist id from the URL, no reason to fetch a whole range and filter client-side. Always the
// caller's own — no cross-user visibility rule, nothing to compose a `checkPermission` around.

import { toChecklist } from '../../../dto/checklists/checklists-dto.ts';
import { getChecklistById } from '../services/checklists-service.ts';
import type { Ctx } from './checklists-context.ts';

export async function getChecklistHandler(ctx: Ctx) {
  const rows = await getChecklistById(ctx, ctx.id!);
  return { checklists: rows.map(toChecklist) };
}
