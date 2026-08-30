// `GET /checklists/:id` — the shape `detail-task-page` needs: it already knows the exact
// checklist id from the URL, no reason to fetch a whole range and filter client-side. Always the
// caller's own — no cross-user visibility rule, nothing to compose a `checkPermission` around.

import { toChecklist } from '../../../dto/checklists/checklists-dto.ts';
import { fetchChecklistById } from '../repository/checklists-repository.ts';
import type { Ctx } from './checklists-context.ts';

export async function getChecklistHandler({ db, userId, id }: Ctx) {
  const rows = await fetchChecklistById(db, userId, id!);
  return { checklists: rows.map(toChecklist) };
}
