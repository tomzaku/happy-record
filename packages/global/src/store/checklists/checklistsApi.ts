// Client for the `checklists` resource — one day's instance of a template.
// See CLAUDE.md. Quiet throughout — useChecklists.tsx's own in-memory state
// is the fallback.

import { request } from '../../lib/api';
import type { Checklist } from './useChecklists';

/** This user's checklists, optionally scoped to one template and/or a `startedAt` range. */
export function fetchChecklists(opts: {
  checklistTemplateId?: string;
  from?: string;
  to?: string;
} = {}): Promise<{ checklists: Checklist[] } | null> {
  return request.get('/checklists', {
    quiet: true,
    params: { checklistTemplateId: opts.checklistTemplateId, from: opts.from, to: opts.to },
  });
}

/** One checklist by id — the shape `detail-task-page` needs, no range to filter. */
export function fetchChecklistById(id: string): Promise<{ checklists: Checklist[] } | null> {
  return request.get(`/checklists/${encodeURIComponent(id)}`, { quiet: true });
}

/**
 * Create or update one checklist. Always the whole object — see `checklists/model/checklists-model.ts`.
 * The response carries the server-resolved checklist back, which can differ from what was sent:
 * a fresh occurrence of a repeating template with no `endedDate` yet gets one filled in from the
 * template's own schedule (see checklists-service.ts's own saveChecklist and
 * supabase/shared/schedules.ts's resolveOccurrenceEnd), and any save can come back under a
 * different `id` than the one sent, when the (template, startedAt) slot already had one.
 */
export function saveChecklist(checklist: Checklist): Promise<{ checklist: Checklist } | null> {
  return request.post('/checklists', { checklist }, { quiet: true });
}

export function removeChecklist(id: string): Promise<{ ok: true } | null> {
  return request.delete(`/checklists/${encodeURIComponent(id)}`, { quiet: true });
}
