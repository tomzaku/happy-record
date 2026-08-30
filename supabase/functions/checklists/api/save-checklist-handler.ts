// `POST /checklists { checklist }` — always the caller's own (hardcoded `user_id` below). `save`
// always takes the *whole* checklist (see `checklists-model.ts`): a caller doing a partial update
// (e.g. just setting `completedAt`) merges with its local copy first, same as `tasks`'
// `updateTask`.

import { ApiError } from '../../../shared/cors.ts';
import { fromChecklist } from '../model/checklists-model.ts';
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

  const { error } = await db.from('checklists').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}
