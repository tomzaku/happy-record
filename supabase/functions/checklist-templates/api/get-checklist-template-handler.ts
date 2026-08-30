// `GET /checklist-templates/:id` — one template, caller's own or anyone's if it's `visibility:
// 'public'` — this is what backs the `/checklist-template/shared/:id` route (see CLAUDE.md).
// `compose(checkCanReadTemplateById, core)`.

import { compose } from '../../../shared/authorize.ts';
import { checkCanReadTemplateById } from '../services/checklist-templates-access-service.ts';
import { getTemplateWithRepeat } from '../services/checklist-templates-service.ts';
import type { Ctx } from './checklist-templates-context.ts';

export const getChecklistTemplateHandler = compose(checkCanReadTemplateById, async (ctx: Ctx, row: Record<string, unknown> | null) => {
  if (!row) return { templates: [] };
  return { templates: [await getTemplateWithRepeat(ctx, row)] };
});
