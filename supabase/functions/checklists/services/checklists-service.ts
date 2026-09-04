// Business logic for `checklists`, between `api/` and `repository/checklists-repository.ts` — no
// real cross-user visibility decision here (every row is already own-row-only), so this stays a
// thin pass-through rather than a `checkPermission`-bearing access-service, but `api/` still
// never queries the DB directly: it always goes through this layer.

import { fetchChecklistById, fetchChecklists, removeChecklist, upsertChecklist } from '../repository/checklists-repository.ts';
import { recordChecklistLog } from '../../../shared/checklistLogs.ts';
import type { Ctx } from '../api/checklists-context.ts';

export function listChecklists(
  { db, userId }: Ctx,
  opts: { templateId?: string | null; from?: string | null; to?: string | null },
): Promise<Record<string, unknown>[]> {
  return fetchChecklists(db, userId, opts);
}

export function getChecklistById({ db, userId }: Ctx, id: string): Promise<Record<string, unknown>[]> {
  return fetchChecklistById(db, userId, id);
}

export async function saveChecklist({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  // This route is a full-row upsert reused for creating a new day's instance, editing one, and
  // checking/unchecking it done (a completedAt patch merged client-side, then re-posted whole —
  // see useChecklists.tsx's own updateChecklist). Only a genuine transition of completed_at
  // (null->set, or set->null for an uncheck) counts as loggable — reading the prior value first is
  // what keeps a later, unrelated resave of an already-completed checklist from re-logging "done"
  // every time.
  const [previous] = await fetchChecklistById(db, userId, row.id as string);
  const previousCompletedAt = previous?.completed_at ?? null;

  await upsertChecklist(db, userId, row);

  if (!previousCompletedAt && row.completed_at) {
    await recordChecklistLog(db, userId, {
      checklistTemplateId: row.checklist_template_id as string,
      checklistId: row.id as string,
      action: 'update',
      detail: 'completed',
    });
  } else if (previousCompletedAt && !row.completed_at) {
    await recordChecklistLog(db, userId, {
      checklistTemplateId: row.checklist_template_id as string,
      checklistId: row.id as string,
      action: 'update',
      detail: 'uncompleted',
    });
  }
}

export function deleteChecklist({ db, userId }: Ctx, id: string): Promise<void> {
  return removeChecklist(db, userId, id);
}
