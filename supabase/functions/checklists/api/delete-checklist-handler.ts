// `DELETE /checklists/:id` — idempotent, always the caller's own row.

import { deleteChecklist } from '../repository/checklists-repository.ts';
import type { Ctx } from './checklists-context.ts';

export async function deleteChecklistHandler({ id, db, userId }: Ctx) {
  await deleteChecklist(db, userId, id!);
  return { ok: true };
}
