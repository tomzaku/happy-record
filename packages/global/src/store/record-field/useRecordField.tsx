import React from 'react';
import { useSyncedCollection, type SyncState } from '../../hook';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md. Every call is quiet: a failure (offline, signed
// out, no backend configured) resolves to null and this hook's own
// useLocalStorage state is the fallback, unchanged.
import { fetchRecordFields, removeRecordField as removeRecordFieldApi, saveRecordField } from './recordFieldApi';

const RECORD_KEY = 'record_field';

export type RecordField = {
  id: string;
  title: string;
  icon: string;
  description: string;
  type: 'metric' | 'note';
  unit: string;
  /**
   * 'public' means any user can use this field in their own checklist
   * templates, not just see it in a list — see CLAUDE.md and
   * supabase/functions/_shared/recordFields.ts. Absent (existing local
   * data, or a field this device hasn't edited since this shipped) is
   * treated the same as 'private'.
   */
  visibility?: 'public' | 'private';
  updatedAt: string;
};

// `updatedAt: epoch` on purpose — these three are a bootstrap fallback only
// (never written to storage until something actually persists them; see
// useSyncedCollection's `initialValue`), so anything the sync fetches for
// real, even the system rows' own genuine timestamps, is unconditionally
// newer and correctly replaces this placeholder.
const NEVER_SYNCED = new Date(0).toISOString();
const defaultRecordField: Record<string, RecordField> = {
  duration: {
    id: 'duration',
    title: 'Duration',
    icon: 'solar:clock-square-broken',
    description: 'Record duration for tracking purpose',
    type: 'metric',
    unit: 'minutes',
    updatedAt: NEVER_SYNCED,
  },
  'push-ups': {
    id: 'push-ups',
    title: 'Push-ups',
    icon: 'iconoir:gym',
    description: 'Push-ups for tracking purpose',
    type: 'metric',
    unit: 'reps',
    updatedAt: NEVER_SYNCED,
  },
  note: {
    id: 'note',
    title: 'Note',
    icon: 'solar:notebook-minimalistic-linear',
    description: 'Write anything',
    type: 'note',
    unit: 'words',
    updatedAt: NEVER_SYNCED,
  },
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Shared across every mounted instance of this store — see useSyncedCollection.
const recordFieldsSyncState: SyncState = { current: null };

export const useRecordField = () => {
  const [recordFieldList, setRecordFieldList] = useSyncedCollection(
    RECORD_KEY,
    recordFieldsSyncState,
    async () => (await fetchRecordFields())?.fields ?? null,
    defaultRecordField,
  );

  // useCallback'd (not a plain closure) so a consumer's own useSyncedSelector
  // can memoize on it — its identity now only changes when `recordFieldList`
  // itself changes, instead of on every render.
  const getAllRecordFields = React.useCallback(() => {
    return Object.values(recordFieldList);
  }, [recordFieldList]);

  const getRecordFields = React.useCallback(
    (ids: string[]) => {
      return ids.map(id => recordFieldList[id]);
    },
    [recordFieldList],
  );

  /**
   * Caches fields this device doesn't own into local state without writing
   * them back — for a shared checklist template's fields, which are already
   * persisted (owned by whoever shared them, `visibility: 'public'`). Saving
   * them again here would upsert a row with this device's `user_id` against
   * an id whose primary key already belongs to someone else, the exact
   * "every client races to write the same global id" bug CLAUDE.md warns
   * about for `fields.id`.
   */
  const mergeRecordFields = (fields: RecordField[]) => {
    setRecordFieldList(prev => {
      const merged = { ...prev };
      let changed = false;
      for (const field of fields) {
        const existing = merged[field.id];
        if (!existing || new Date(field.updatedAt) > new Date(existing.updatedAt)) {
          merged[field.id] = field;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  };

  const addRecordField = (
    checklistRecord: PartialBy<RecordField, 'id' | 'updatedAt'>,
    keepId = false,
  ) => {
    const newId = keepId && checklistRecord.id ? checklistRecord.id : v4();
    const field: RecordField = {
      ...checklistRecord,
      id: newId,
      updatedAt: new Date().toISOString(),
    };
    setRecordFieldList(prev => ({
      ...prev,
      [newId]: field,
    }));
    saveRecordField(field);
    return field;
  };

  const removeRecordField = (id: string) => {
    setRecordFieldList(prev => {
      const newChecklistRecord = { ...prev };
      delete newChecklistRecord[id];
      return newChecklistRecord;
    });
    removeRecordFieldApi(id);
  };

  const updateRecordField = (id: string, updates: Partial<RecordField>) => {
    let updatedRecord: RecordField | null = null;
    setRecordFieldList(prev => {
      if (!prev[id]) {
        throw new Error(`Record field with id ${id} not found`);
      }
      const newRecord = {
        ...prev[id],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      updatedRecord = newRecord;
      return {
        ...prev,
        [id]: newRecord,
      };
    });
    if (updatedRecord) saveRecordField(updatedRecord);
    return updatedRecord;
  };

  return {
    getAllRecordFields,
    getRecordFields,
    addRecordField,
    removeRecordField,
    updateRecordField,
    mergeRecordFields,
  };
};
