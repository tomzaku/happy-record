// Business logic for `flags`, between `api/` and `repository/flags-repository.ts` — no real
// cross-user visibility decision here (every row is already own-row-only), so this stays a thin
// pass-through rather than a `checkPermission`-bearing access-service, but `api/` still never
// queries the DB directly: it always goes through this layer.

import { fetchFlags, removeFlag, upsertFlag } from '../repository/flags-repository.ts';
import type { Ctx } from '../api/flags-context.ts';

export function listFlags({ db, userId }: Ctx): Promise<Record<string, unknown>[]> {
  return fetchFlags(db, userId);
}

export function saveFlag({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  return upsertFlag(db, userId, row);
}

export function deleteFlag({ db, userId }: Ctx, id: string): Promise<void> {
  return removeFlag(db, userId, id);
}
