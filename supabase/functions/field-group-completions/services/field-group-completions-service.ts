// Business logic for `field-group-completions`, between `api/` and
// `repository/field-group-completions-repository.ts` — no real cross-user visibility decision
// here (every row is already own-row-only, scoped by both user_id and checklist_id), so this
// stays a thin pass-through rather than a `checkPermission`-bearing access-service, but `api/`
// still never queries the DB directly: it always goes through this layer.

import {
  fetchFieldGroupCompletions,
  removeFieldGroupCompletion,
  upsertFieldGroupCompletion,
} from '../repository/field-group-completions-repository.ts';
import type { Ctx } from '../api/field-group-completions-context.ts';

export function listFieldGroupCompletions(
  { db, userId }: Ctx,
  checklistId: string,
): Promise<Record<string, unknown>[]> {
  return fetchFieldGroupCompletions(db, userId, checklistId);
}

export function saveFieldGroupCompletion({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  return upsertFieldGroupCompletion(db, userId, row);
}

export function deleteFieldGroupCompletion({ db, userId }: Ctx, id: string): Promise<void> {
  return removeFieldGroupCompletion(db, userId, id);
}
