// Client for the `fields` resource (table: `fields`). See CLAUDE.md —
// nothing else should touch that table. Named recordFieldApi/RecordField
// here to match this store's existing vocabulary; only the table and the
// edge function dropped the "record" prefix.
//
// Every call is quiet: this store's own useLocalStorage state
// (useRecordField.tsx) is always the fallback.

import { request } from '../../lib/api';
import type { RecordField } from './useRecordField';

export function fetchRecordFields(): Promise<{ fields: RecordField[] } | null> {
  return request.get('/fields', { quiet: true });
}

/**
 * Resolves a specific set of field ids (own or `visibility: 'public'`) —
 * used by the CardShare/tasks-shared-page-ui "share this template" flow to
 * read the owner's own fields (e.g. for the field-target picker), not to
 * resolve a shared template's fields on the recipient's side — see
 * fetchRecordFieldsByTemplateId below for that.
 */
export function fetchRecordFieldsByIds(ids: string[]): Promise<{ fields: RecordField[] } | null> {
  if (!ids.length) return Promise.resolve({ fields: [] });
  return request.get('/fields', { quiet: true, params: { ids: ids.join(',') } });
}

/**
 * Every field one already-public checklist template's own field_groups reference — what the
 * shared-template page actually resolves fields with (useGetChecklistTemplateApi.tsx), since a
 * shared template's fields stay `visibility: 'private'` now (see fields/index.ts's own
 * listByTemplate): the template being public is the authorization, not the field itself.
 */
export function fetchRecordFieldsByTemplateId(
  templateId: string,
): Promise<{ fields: RecordField[] } | null> {
  return request.get('/fields', { quiet: true, params: { templateId } });
}

export function saveRecordField(field: RecordField): Promise<{ ok: true } | null> {
  return request.post('/fields', { field }, { quiet: true });
}

export function removeRecordField(id: string): Promise<{ ok: true } | null> {
  return request.delete(`/fields/${encodeURIComponent(id)}`, { quiet: true });
}
