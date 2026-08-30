// Business logic for `field-groups` that isn't a permission decision — see
// `field-groups-access-service.ts` for those. Thin pass-through to
// `repository/field-groups-repository.ts`; `api/` never reaches in there directly.

import { saveRepeat } from '../../../shared/repeats.ts';
import {
  fetchFieldGroupsByTemplate,
  fetchFieldGroupsByUser,
  upsertFieldGroup,
  withRepeats,
} from '../repository/field-groups-repository.ts';
import type { Ctx } from '../api/field-groups-context.ts';

export async function listFieldGroupsByTemplate({ db, userId }: Ctx, templateId: string, isPublic: boolean) {
  const rows = await fetchFieldGroupsByTemplate(db, templateId);
  return withRepeats(db, userId, rows, isPublic);
}

export async function listMyFieldGroups({ db, userId }: Ctx) {
  const rows = await fetchFieldGroupsByUser(db, userId);
  return withRepeats(db, userId, rows, false);
}

export async function saveFieldGroup({ db, userId }: Ctx, row: Record<string, unknown>, repeat: unknown): Promise<void> {
  await upsertFieldGroup(db, userId, row);
  // After the group row exists — repeats.field_group_id is a real FK, so the parent has to be
  // there first.
  await saveRepeat(db, repeat, { userId, fieldGroupId: row.id as string });
}
