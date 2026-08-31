// Client for the `field-groups` resource. See CLAUDE.md.
//
// Quiet throughout — useFieldGroups.tsx's own in-memory state is the fallback.

import { request } from '../../lib/api';
import type { FieldGroup } from './useChecklistTemplates';

/** `checklistTemplateId` omitted → every group across all of the caller's templates (see the
 * edge function's own comment on why that's needed at all). */
export function fetchFieldGroups(
  opts: { checklistTemplateId?: string } = {},
): Promise<{ fieldGroups: FieldGroup[] } | null> {
  return request.get('/field-groups', {
    quiet: true,
    params: { checklistTemplateId: opts.checklistTemplateId },
  });
}

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
