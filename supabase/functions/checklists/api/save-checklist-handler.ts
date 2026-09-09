// `POST /checklists { checklist }` — always the caller's own (hardcoded `user_id` in the
// repository). `save` always takes the *whole* checklist (see `checklists-dto.ts`): a caller
// doing a partial update (e.g. just setting `completedAt`) merges with its local copy first,
// same as `tasks`' `updateTask`.

import { ApiError } from '../../../shared/cors.ts';
import { fromChecklist, toChecklist } from '../../../dto/checklists/checklists-dto.ts';
import { saveChecklist } from '../services/checklists-service.ts';
import { body, type Ctx } from './checklists-context.ts';

export async function saveChecklistHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).checklist;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing checklist.');

  let row: ReturnType<typeof fromChecklist>;
  try {
    row = fromChecklist(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid checklist.');
  }

  // The saved row, mapped back to the client shape — a fresh occurrence of a repeating schedule
  // resolved a real `endedDate` (and any save may have adopted a different, already-existing `id`
  // for its exact (template, startedAt) slot) the caller had no way to know in advance; see
  // checklists-service.ts's own saveChecklist.
  const saved = await saveChecklist(ctx, row);
  return { checklist: toChecklist(saved) };
}
