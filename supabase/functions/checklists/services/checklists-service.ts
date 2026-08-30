// Business logic for `checklists`, between `api/` and `repository/checklists-repository.ts` — no
// real cross-user visibility decision here (every row is already own-row-only), so this stays a
// thin pass-through rather than a `checkPermission`-bearing access-service, but `api/` still
// never queries the DB directly: it always goes through this layer.

import { fetchChecklistById, fetchChecklists, removeChecklist, upsertChecklist } from '../repository/checklists-repository.ts';
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

export function saveChecklist({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  return upsertChecklist(db, userId, row);
}

export function deleteChecklist({ db, userId }: Ctx, id: string): Promise<void> {
  return removeChecklist(db, userId, id);
}
