// Thin typed client for the `field-groups` edge function's write routes — one exported function
// per route. Quiet throughout: a failure resolves to null, and useFieldGroupMutations.ts's own
// optimistic write is the fallback. No client-side read function here anymore: `GET
// /field-groups`/`GET /field-groups?checklistTemplateId=` still exist server-side, but a
// `ChecklistTemplate` already carries its own real `fieldGroups` embedded on every read
// (checklist-templates-dto.ts) — nothing client-side fetches this resource directly by itself now.

import { request } from '../../lib/api';
import type { FieldGroup } from './fieldGroupTypes';

export function saveFieldGroup(fieldGroup: FieldGroup): Promise<{ ok: true } | null> {
  return request.post('/field-groups', { fieldGroup }, { quiet: true });
}

/** A challenge participant's own override of one group's schedule — never the owner's full-row
 * `saveFieldGroup` above, which they can't write anyway (see the edge function's own doc
 * comment). `repeat: null` clears it back to following the owner's. */
export function patchFieldGroupRepeat(
  id: string,
  repeat: FieldGroup['repeat'] | null,
): Promise<{ ok: true } | null> {
  return request.patch(`/field-groups/${encodeURIComponent(id)}`, { repeat }, { quiet: true });
}
