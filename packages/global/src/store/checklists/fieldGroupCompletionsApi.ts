// Client for the `field-group-completions` resource. See CLAUDE.md — nothing else should touch
// that table. Quiet throughout — useFieldGroupCompletions.tsx's own React Query cache is the
// fallback.

import { request } from '../../lib/api';
import type { FieldGroupCompletion } from './useFieldGroupCompletions';

export function fetchFieldGroupCompletions(
  checklistId: string,
): Promise<{ fieldGroupCompletions: FieldGroupCompletion[] } | null> {
  return request.get(`/field-group-completions?checklistId=${encodeURIComponent(checklistId)}`, { quiet: true });
}

export function saveFieldGroupCompletion(
  fieldGroupCompletion: FieldGroupCompletion,
): Promise<{ ok: true } | null> {
  return request.post('/field-group-completions', { fieldGroupCompletion }, { quiet: true });
}

export function removeFieldGroupCompletion(id: string): Promise<{ ok: true } | null> {
  return request.delete(`/field-group-completions/${encodeURIComponent(id)}`, { quiet: true });
}
