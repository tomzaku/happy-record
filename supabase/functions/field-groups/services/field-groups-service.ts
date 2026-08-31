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

/** A challenge participant's own override of one group's schedule — `PATCH /field-groups/:id
 * { repeat }`. Never gated by ownership: `saveRepeat`'s own deterministic row id
 * (`fg:{fieldGroupId}:{userId}`) already guarantees this can only ever touch the caller's own
 * row, the same "repeat is a separate write from the rest of the resource" carve-out
 * checklist-templates' own PATCH uses for its top-level schedule — see that resource's
 * `updateTemplate` and CLAUDE.md's own note on why. */
export function updateMyFieldGroupRepeat({ db, userId }: Ctx, fieldGroupId: string, repeat: unknown): Promise<void> {
  return saveRepeat(db, repeat, { userId, fieldGroupId });
}
