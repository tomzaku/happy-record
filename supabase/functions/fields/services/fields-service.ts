// Business logic for `fields` that isn't a permission decision — see `fields-access-service.ts`
// for those. Thin pass-through to `repository/fields-repository.ts`; `api/` never reaches in
// there directly.

import {
  fetchFieldsByIds,
  fetchOwnOrPublicFields,
  removeField,
  upsertField,
} from '../repository/fields-repository.ts';
import type { Ctx } from '../api/fields-context.ts';

export function listFieldsByIds({ db }: Ctx, ids: string[]): Promise<Record<string, unknown>[]> {
  return fetchFieldsByIds(db, ids);
}

export function listOwnOrPublicFields({ db, userId }: Ctx, ids: string[]): Promise<Record<string, unknown>[]> {
  return fetchOwnOrPublicFields(db, userId, ids);
}

export function saveField({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  return upsertField(db, userId, row);
}

export function deleteField({ db, userId }: Ctx, id: string): Promise<void> {
  return removeField(db, userId, id);
}
