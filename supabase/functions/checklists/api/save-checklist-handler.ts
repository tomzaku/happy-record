// `POST /checklists { checklist }` — always the caller's own (hardcoded `user_id` below). `save`
// always takes the *whole* checklist (see `checklists-dto.ts`): a caller doing a partial update
// (e.g. just setting `completedAt`) merges with its local copy first, same as `tasks`'
// `updateTask`.

import { ApiError } from '../../../shared/cors.ts';
import { fromChecklist } from '../../../dto/checklists/checklists-dto.ts';
import { saveChecklist } from '../repository/checklists-repository.ts';
import { body, type Ctx } from './checklists-context.ts';

export async function saveChecklistHandler({ req, db, userId }: Ctx) {
  const entry = (await body(req)).checklist;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing checklist.');

  let row: ReturnType<typeof fromChecklist>;
  try {
    row = fromChecklist(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid checklist.');
  }

  await saveChecklist(db, userId, row);
  return { ok: true };
}
