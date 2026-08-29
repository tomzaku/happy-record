// Client for the `checklist-templates` resource. See CLAUDE.md.
//
// Quiet throughout — useChecklistTemplates.tsx's own useLocalStorage state
// is the fallback.

import { request } from '../../lib/api';
import type { ChecklistTemplate } from './useChecklistTemplates';

export function fetchChecklistTemplates(): Promise<{ templates: ChecklistTemplate[] } | null> {
  return request.get('/checklist-templates', { quiet: true });
}

/**
 * The `/checklist-template/shared/:id` lookup — the caller's own template or
 * anyone's if it's `visibility: 'public'` (see the edge function's RLS-backed
 * `?id=` branch). `null` here can mean offline, or the template genuinely
 * isn't public/doesn't exist — same "use what's already there, else nothing"
 * shape as everywhere else in this app; the caller renders its own empty state.
 */
export function fetchChecklistTemplateById(id: string): Promise<{ templates: ChecklistTemplate[] } | null> {
  return request.get('/checklist-templates', { quiet: true, params: { id } });
}

export function saveChecklistTemplate(template: ChecklistTemplate): Promise<{ ok: true } | null> {
  return request.post('/checklist-templates', { template }, { quiet: true });
}

/**
 * Edits only the fields actually changed — `updateChecklistTemplate` diffs
 * against its current local copy before calling this, so touching one field
 * (a schedule, a tag) doesn't overwrite whatever else changed the row
 * server-side since this device's last read. `fieldGroups` isn't part of this
 * row anymore — see useFieldGroups.tsx's own `updateFieldGroup`.
 */
export function patchChecklistTemplate(
  id: string,
  changes: Partial<Omit<ChecklistTemplate, 'id' | 'createdAt' | 'fieldGroups'>>,
): Promise<{ ok: true } | null> {
  return request.patch('/checklist-templates', { id, ...changes }, { quiet: true });
}

export function removeChecklistTemplate(id: string): Promise<{ ok: true } | null> {
  return request.delete('/checklist-templates', { quiet: true, params: { id } });
}
