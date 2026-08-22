// Client for the `checklists` resource — one day's instance of a template.
// See CLAUDE.md. Quiet throughout — useChecklist.tsx's own useLocalStorage
// state is the fallback.

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

/** Create or update one checklist. Always the whole object — see `_shared/checklists.ts`. */
export function saveChecklist(checklist: Checklist): Promise<{ ok: true } | null> {
  return request.post('/checklists', { checklist }, { quiet: true });
}
