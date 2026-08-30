// `GET /checklists` — the collection route, optionally scoped to one template and/or a
// `started_at` range. A single checklist by its own id is a separate route now — see
// `get-checklist-handler.ts`'s `GET /checklists/:id`. Always the caller's own — no cross-user
// visibility rule, nothing to compose a `checkPermission` around (a checklist is one user's own
// day-instance of a template, never shared directly; a challenge dashboard's own peer-read of
// *other* participants' checklists happens in `challenges/index.ts`, on its own explicit query).

import { toChecklist } from '../../../dto/checklists/checklists-dto.ts';
import { listChecklists } from '../services/checklists-service.ts';
import type { Ctx } from './checklists-context.ts';

export async function listChecklistsHandler(ctx: Ctx) {
  const rows = await listChecklists(ctx, {
    templateId: ctx.url.searchParams.get('checklistTemplateId'),
    from: ctx.url.searchParams.get('from'),
    to: ctx.url.searchParams.get('to'),
  });
  return { checklists: rows.map(toChecklist) };
}
