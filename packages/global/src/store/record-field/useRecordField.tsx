import React from 'react';
import { useLocalStorage } from '../../hook';
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
};

const defaultRecordField: Record<string, RecordField> = {
  duration: {
    id: 'duration',
    title: 'Duration',
    icon: 'solar:clock-square-broken',
    description: 'Record duration for tracking purpose',
    type: 'metric',
    unit: 'minutes',
  },
  'push-ups': {
    id: 'push-ups',
    title: 'Push-ups',
    icon: 'iconoir:gym',
    description: 'Push-ups for tracking purpose',
    type: 'metric',
    unit: 'reps',
  },
  note: {
    id: 'note',
    title: 'Note',
    icon: 'solar:notebook-minimalistic-linear',
    description: 'Write anything',
    type: 'note',
    unit: 'words',
  },
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// This hook is called from many components sharing the same
// useLocalStorage-backed store (see useLocalStorage.ts's cache-by-key), so
// without a guard every one of them would fire its own sync-down request on
// mount. One flag, module-scoped, makes it happen once per page load; a
// failed/offline attempt resets it so the next mount tries again.
let recordFieldsSynced = false;

export const useRecordField = () => {
  const [recordFieldList, setRecordFieldList] = useLocalStorage<
    Record<string, RecordField>
  >(RECORD_KEY, defaultRecordField);

  React.useEffect(() => {
    if (recordFieldsSynced) return;
    recordFieldsSynced = true;
    fetchRecordFields().then(result => {
      if (!result) {
        recordFieldsSynced = false;
        return;
      }
      // Only fills in fields this device doesn't already have — an
      // unsynced local edit always wins over a stale server copy.
      setRecordFieldList(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const field of result.fields) {
          if (!merged[field.id]) {
            merged[field.id] = field;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    });
  }, []);

  const getAllRecordFields = () => {
    return Object.values(recordFieldList);
  };

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
        if (!merged[field.id]) {
          merged[field.id] = field;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  };

  const addRecordField = (
    checklistRecord: PartialBy<RecordField, 'id'>,
    keepId = false,
  ) => {
    const newId = keepId && checklistRecord.id ? checklistRecord.id : v4();
    const field: RecordField = {
      id: newId,
      ...checklistRecord,
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
    getRecordFields: (ids: string[]) => {
      return ids.map(id => recordFieldList[id]);
    },
    addRecordField,
    removeRecordField,
    updateRecordField,
    mergeRecordFields,
  };
};
