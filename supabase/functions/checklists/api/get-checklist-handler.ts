// `GET /checklists/:id` — the shape `detail-task-page` needs: it already knows the exact
// checklist id from the URL, no reason to fetch a whole range and filter client-side. Always the
// caller's own — no cross-user visibility rule, nothing to compose a `checkPermission` around.

import { toChecklist } from '../../../dto/checklists/checklists-dto.ts';
import type { Ctx } from './checklists-context.ts';

export async function getChecklistHandler({ db, userId, id }: Ctx) {
  const { data, error } = await db.from('checklists').select('*').eq('user_id', userId).eq('id', id!).limit(1);
  if (error) throw new Error(error.message);
  return { checklists: ((data ?? []) as Record<string, unknown>[]).map(toChecklist) };
}
