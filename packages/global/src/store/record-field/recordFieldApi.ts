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
 * used by the shared-template page, which needs exactly the fields one
 * template's field_groups reference without waiting on a full sync.
 */
export function fetchRecordFieldsByIds(ids: string[]): Promise<{ fields: RecordField[] } | null> {
  if (!ids.length) return Promise.resolve({ fields: [] });
  return request.get('/fields', { quiet: true, params: { ids: ids.join(',') } });
}

export function saveRecordField(field: RecordField): Promise<{ ok: true } | null> {
  return request.post('/fields', { field }, { quiet: true });
}

export function removeRecordField(id: string): Promise<{ ok: true } | null> {
  return request.delete('/fields', { quiet: true, params: { id } });
}
