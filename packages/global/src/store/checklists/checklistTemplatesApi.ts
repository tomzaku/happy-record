// Thin typed client for the `checklist-templates` edge function — one exported function per
// route. Quiet throughout: a failure resolves to null, and useChecklistTemplatesQuery.ts's own
// cache is the fallback.

import { request } from '../../lib/api';
import type { ChecklistTemplate } from './checklistTemplateTypes';
import type { Checklist } from './useChecklists';

export function fetchChecklistTemplates(): Promise<{ templates: ChecklistTemplate[] } | null> {
  return request.get('/checklist-templates', { quiet: true });
}

/**
 * The `/checklist-template/shared/:id` lookup — the caller's own template or anyone's if it's
 * `visibility: 'public'` (see the edge function's own checkCanReadTemplateById). `null` here can
 * mean offline, or the template genuinely isn't public/doesn't exist — same "use what's already
 * there, else nothing" shape as everywhere else in this app; the caller renders its own empty
 * state.
 */
export function fetchChecklistTemplateById(id: string): Promise<{ templates: ChecklistTemplate[] } | null> {
  return request.get(`/checklist-templates/${encodeURIComponent(id)}`, { quiet: true });
}

/**
 * `checklist` is optional — only a one-off task's own creation flow (createTaskUtil.ts) sends
 * one, seeding that task's single Checklist instance in this same request rather than a separate
 * `POST /checklists` afterward (which used to have to `await` this one landing first, to avoid
 * racing `checklists.checklist_template_id`'s own FK — see the edge function's own comment).
 */
export function saveChecklistTemplate(
  template: ChecklistTemplate,
  checklist?: Checklist,
): Promise<{ ok: true } | null> {
  return request.post('/checklist-templates', { template, ...(checklist ? { checklist } : {}) }, { quiet: true });
}

/**
 * Edits only the fields actually changed — `updateChecklistTemplate` diffs
 * against its current local copy before calling this, so touching one field
 * (a schedule, a tag) doesn't overwrite whatever else changed the row
 * server-side since this device's last read. `fieldGroups` isn't part of this
 * row anymore — see useFieldGroups.tsx's own `updateFieldGroup`.
 *
 * `repeat` accepts `null` in addition to `ChecklistTemplate['repeat']` — not just omitting the
 * key — so a caller can explicitly clear a schedule (see updateMyReminder's own comment on why
 * `undefined` can't do this: `JSON.stringify` drops an `undefined`-valued key entirely, same
 * footgun FieldGroup.archivedAt has).
 */
export function patchChecklistTemplate(
  id: string,
  changes: Partial<Omit<ChecklistTemplate, 'id' | 'createdAt' | 'fieldGroups' | 'repeat'>> & {
    repeat?: ChecklistTemplate['repeat'] | null;
  },
): Promise<{ ok: true } | null> {
  return request.patch(`/checklist-templates/${encodeURIComponent(id)}`, changes, { quiet: true });
}

export function removeChecklistTemplate(id: string): Promise<{ ok: true } | null> {
  return request.delete(`/checklist-templates/${encodeURIComponent(id)}`, { quiet: true });
}
