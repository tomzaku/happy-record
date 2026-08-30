// `GET /checklist-templates` — "all mine, plus anything I've joined a challenge for." A single
// template by its own id is a separate route now — see `get-checklist-template-handler.ts`'s
// `GET /checklist-templates/:id`. No single `checkPermission` to compose here: the owned half is
// a plain explicit filter, and the joined half's own visibility check is a batch filter over rows
// already scoped to ids this caller is known to have joined, not a single allow/deny decision.

import { listOwnedAndJoinedTemplates } from '../services/checklist-templates-service.ts';
import type { Ctx } from './checklist-templates-context.ts';

export async function listChecklistTemplatesHandler(ctx: Ctx) {
  return { templates: await listOwnedAndJoinedTemplates(ctx) };
}
