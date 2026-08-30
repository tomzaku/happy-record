// `GET /checklist-templates/:id` — one template, caller's own or anyone's if it's `visibility:
// 'public'` — this is what backs the `/checklist-template/shared/:id` route (see CLAUDE.md).
// `compose(checkCanReadTemplateById, core)`.

import { compose } from '../../../shared/authorize.ts';
import { fetchRepeats } from '../../../shared/repeats.ts';
import { checkCanReadTemplateById, repeatOwnerOf, resolveTemplate } from '../services/checklist-templates-access-service.ts';
import type { Ctx } from './checklist-templates-context.ts';

export const getChecklistTemplateHandler = compose(
  checkCanReadTemplateById,
  async ({ db, userId }: Ctx, row: Record<string, unknown> | null) => {
    if (!row) return { templates: [] };
    const repeats = await fetchRepeats(db, 'checklistTemplateId', [repeatOwnerOf(row)], userId);
    return { templates: [resolveTemplate(row, repeats, userId)] };
  },
);
