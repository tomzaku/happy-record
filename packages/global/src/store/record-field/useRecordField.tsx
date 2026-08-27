import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure (offline, signed out, no backend configured) resolves to null
// and this hook's own in-memory state is the fallback, unchanged.
import {
  fetchRecordFields,
  fetchRecordFieldsByIds,
  removeRecordField as removeRecordFieldApi,
  saveRecordField,
} from './recordFieldApi';

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
  /**
   * Metric-only. Pre-fills the daily submit screen's input for this field
   * (ChecklistFieldGroupAdd's getEmptyFieldRecord) instead of starting
   * blank — still fully editable. Set through the Edit Field form
   * (CoreFieldRecord) by whoever owns this row, which is exactly what makes
   * a per-person override work for a field that started as someone else's:
   * see `copiedFromId` below.
   */
  defaultValue?: number;
  /**
   * Lineage only, set once at fork time — see useJoinChallenge.tsx.
   * A joiner's own copy of a shared field (title/icon/unit/defaultValue all
   * copied as a starting point, then independently editable) points back
   * at the original via this, never read for access control.
   */
  copiedFromId?: string;
  /**
   * Never actually persisted on a field's own row — there's no placeholder input on the global
   * Add/Edit Field form (CoreFieldRecord). This only ever appears on the merged object
   * `getEffectiveFieldDisplay` below returns, carrying a group's own override through so a
   * consumer (ChecklistFieldGroupAdd's submit input) can read it off a plain `RecordField`
   * without a second, wider type. Present here purely so that merge has somewhere to put it.
   */
  placeholder?: string;
  updatedAt: string;
};

/**
 * A field group can override a handful of a field's own display properties for just that group
 * — see FieldGroupField in useChecklistTemplates.tsx and its own doc comment for why (the same
 * "Duration" field meaning 10 minutes in a Push group and 20 in a Cardio group, without forking
 * the field itself). Deliberately a small, named subset of RecordField rather than
 * `Partial<RecordField>` — `type`/`unit`/`visibility`/`copiedFromId` describe the field itself,
 * not how one group happens to show it, and letting a group override them would let two groups
 * disagree about what kind of field this even is.
 */
export type FieldOverrides = {
  title?: string;
  icon?: string;
  /** Metric-only, same as RecordField.defaultValue itself. */
  defaultValue?: number;
  placeholder?: string;
};

/**
 * Merges a group's own per-field overrides onto the field's global values — override wins when
 * set, else the field's own value, same shape either way so every consumer (the group's own
 * Select Fields editor, and the actual submit/history/metric rendering in ChecklistFieldGroup)
 * reads through this one function instead of re-implementing the "which value wins" check.
 */
export const getEffectiveFieldDisplay = (
  field: RecordField,
  overrides?: FieldOverrides,
): RecordField => ({
  ...field,
  title: overrides?.title ?? field.title,
  icon: overrides?.icon ?? field.icon,
  defaultValue: overrides?.defaultValue ?? field.defaultValue,
  placeholder: overrides?.placeholder,
});

// `updatedAt: epoch` on purpose — these three are a bootstrap fallback only
// (never written to storage until something actually persists them), so
// anything a real fetch returns, even the system rows' own genuine
// timestamps, is unconditionally newer and correctly replaces this
// placeholder.
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

// Fetched by whatever scope is actually asked for — "all mine + public"
// (needed by most consumers: field pickers, the manage-fields screen, AI
// context, dedupe checks) or a specific set of ids (the share-flow
// consumers, which only need one template's referenced fields) — never
// unconditionally on mount. Keyed so the same (identity, scope) tuple isn't
// re-fetched every call within a page load.
const fetchedScopes = new Set<string>();
const ALL_SCOPE = '__all__';

export const useRecordField = () => {
  const [recordFieldList, setRecordFieldList] = useSessionStore<Record<string, RecordField>>(
    RECORD_KEY,
    defaultRecordField,
  );
  const { userId, ready } = useSession();

  /**
   * Merges fetched (or shared-template) fields into local state without
   * writing them back if this device doesn't own them — for a shared
   * checklist template's fields, which are already persisted (owned by
   * whoever shared them, `visibility: 'public'`). Saving them again here
   * would upsert a row with this device's `user_id` against an id whose
   * primary key already belongs to someone else, the exact "every client
   * races to write the same global id" bug CLAUDE.md warns about for
   * `fields.id`.
   */
  const mergeRecordFields = React.useCallback(
    (fields: RecordField[]) => {
      if (!fields.length) return;
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
    },
    [setRecordFieldList],
  );

  // useCallback'd (not a plain closure) so a consumer's own useSyncedSelector
  // can memoize on it — its identity now only changes when `recordFieldList`
  // itself changes, instead of on every render.
  const getAllRecordFields = React.useCallback(() => {
    const scopeKey = JSON.stringify({ userId, scope: ALL_SCOPE });
    if (ready && !fetchedScopes.has(scopeKey)) {
      fetchedScopes.add(scopeKey);
      fetchRecordFields().then(result => {
        if (!result) {
          fetchedScopes.delete(scopeKey);
          return;
        }
        mergeRecordFields(result.fields);
      });
    }
    return Object.values(recordFieldList);
  }, [recordFieldList, userId, ready, mergeRecordFields]);

  const getRecordFields = React.useCallback(
    (ids: string[]) => {
      return ids.map(id => recordFieldList[id]);
    },
    [recordFieldList],
  );

  /**
   * Scoped fetch for exactly the ids asked for — the share-flow consumers
   * (CardShare, tasks-shared-page-ui, checklist-template-shared-page-ui)
   * only need one template's referenced field ids, not the full list.
   * Async and awaited (unlike every other read here) because these are
   * one-shot action handlers ("generate a share link") that need the real
   * field data this tick to build a request payload — not a render-time
   * value that's fine to start empty and fill in on a later re-render.
   * Builds the return value from what was already cached plus the fresh
   * response directly, rather than re-reading the store after the await —
   * the `recordFieldList` closure here is stale by the time `setRecordFieldList`
   * (inside `mergeRecordFields`) actually lands.
   */
  const getRecordFieldsByIds = React.useCallback(
    async (ids: string[]): Promise<RecordField[]> => {
      const uniqueIds = [...new Set(ids)];
      const have: Record<string, RecordField> = {};
      for (const id of uniqueIds) {
        if (recordFieldList[id]) have[id] = recordFieldList[id];
      }
      const missingIds = uniqueIds.filter(id => !have[id]);
      if (ready && missingIds.length) {
        const result = await fetchRecordFieldsByIds(missingIds);
        if (result) {
          mergeRecordFields(result.fields);
          for (const field of result.fields) have[field.id] = field;
        }
      }
      return uniqueIds.map(id => have[id]).filter((f): f is RecordField => !!f);
    },
    [recordFieldList, ready, mergeRecordFields],
  );

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
    getRecordFieldsByIds,
    addRecordField,
    removeRecordField,
    updateRecordField,
    mergeRecordFields,
  };
};
