import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';
import { recordFieldsKeys } from './recordFieldsKeys';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure (offline, signed out, no backend configured) resolves to null
// and this hook's own in-memory state is the fallback, unchanged.
import {
  fetchRecordFields,
  fetchRecordFieldsByIds,
  fetchRecordFieldsByTemplateId,
  removeRecordField as removeRecordFieldApi,
  saveRecordField,
} from './recordFieldApi';

const RECORD_ALL_LOADING_KEY = 'record_field_all_loading';

export type RecordField = {
  id: string;
  title: string;
  icon: string;
  description: string;
  // 'text'/'date'/'datetime'/'select' all carry a plain string `ChecklistRecord.value` — same
  // wire shape a `number`-type field's own value already had (see checklist-records/index.ts's
  // own `isNoteEntry`), told apart from `number`'s own numeric one only by this `type`, which the
  // UI reads to pick the right input/display (short text vs. a date/datetime picker vs. a number
  // input vs. a list of options). `date`/`datetime` are always stored as a full ISO 8601
  // timestamp — see 20260829070000_field_types_text_date.sql — a `date`-type field's own "just
  // the day" display is purely how the client formats it. `multiselect` is the one exception: its
  // own value is a JSON-encoded array of the chosen options, still a plain string on the wire —
  // see checklistRecordApi.ts's own serializeMultiselect/parseMultiselect, the only place that
  // encoding is ever touched. 'number' was 'metric' until 20260829080000_field_type_metric_to_number.sql.
  // 'photo'/'video' (20260901000000_media.sql) carry a `media` row's own id as this same plain
  // string — an uploaded attachment, never stored on the field's own row. See
  // packages/global/src/store/media/useMediaUrl.ts for how a component resolves that id into an
  // actual playable URL; nothing in this file changes for these two.
  type: 'number' | 'note' | 'text' | 'date' | 'datetime' | 'select' | 'multiselect' | 'photo' | 'video';
  unit: string;
  /**
   * The fixed list of choices a `select`/`multiselect` field offers — required for those two
   * types (enforced server-side, see 20260829110000_field_types_select.sql and
   * _shared/fields.ts's own validation), meaningless and never read for every other type. Order
   * here is display order, not alphabetized — set once through the Add/Edit Field form
   * (CoreFieldRecord) and edited the same way a field's own title/icon are.
   */
  options?: string[];
  /**
   * 'public' means any user can use this field in their own checklist templates, not just see it
   * in a list — see CLAUDE.md and supabase/functions/_shared/fields.ts. Never settable through
   * this app's UI/API anymore: the server always writes 'private' for a real user's own field
   * regardless of what's sent (`fromRecordField`'s own comment), so this only ever comes back
   * 'public' for the three seeded system defaults (`duration`/`push-ups`/`note`), written by a
   * migration under the service role. Sharing a checklist template used to flip a referenced
   * field to 'public' too — it no longer does (see useCreateChecklistTemplateApi.tsx); a shared
   * template's own fields stay private and get resolved a different way for the recipient. Absent
   * (existing local data, or a field this device hasn't edited since this shipped) is treated the
   * same as 'private'.
   */
  visibility?: 'public' | 'private';
  /**
   * number-only. Pre-fills the daily submit screen's input for this field
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
  /**
   * Only meaningful for `type: 'note'` — this field's own single current note (see
   * 20260829010000_notes_note_id_ownership.sql and useNote.tsx's `Note`). One note per field,
   * edited in place, not a per-entry journal — set the first time someone saves content into it
   * (useNoteById.ts creates the note, then calls updateRecordField(id, { noteId }) to persist
   * this), read from wherever that field's note editor lives (ChecklistFieldGroupView for an
   * in-checklist note-type field, note-manager-page-ui/add-note-page-ui for the standalone
   * notebook).
   */
  noteId?: string;
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
 * Select Fields editor, and the actual submit/history rendering in ChecklistFieldGroup)
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

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type RecordFieldsMap = Record<string, RecordField>;
// Scoped to the one field being written, not a whole-map snapshot — see useTags.tsx's own
// comment (same fix, same resource shape) for why a global snapshot isn't safe under concurrent
// writes.
type RollbackContext = { previousField: RecordField | undefined };

// Fetched by whatever scope is actually asked for — "all mine + public"
// (needed by most consumers: field pickers, the manage-fields screen, AI
// context, dedupe checks) or a specific set of ids (the share-flow
// consumers, which only need one template's referenced fields) — never
// unconditionally on mount. Keyed so the same (identity, scope) tuple isn't
// re-fetched every call within a page load.
const fetchedScopes = new Set<string>();
const ALL_SCOPE = '__all__';

export const useRecordField = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = recordFieldsKeys.map(userId);

  // The shared fields cache, backed by React Query instead of useSessionStore — same "one cache
  // entry, several imperative scoped fetches merging into it" shape as useNote.tsx's own notes
  // cache (see recordFieldsKeys.ts's own comment on why). `enabled: false` since nothing
  // auto-fetches this query itself; every read function below does its own scoped fetch and
  // merges via setQueryData.
  const { data: recordFieldList = {} } = useQuery<RecordFieldsMap>({
    queryKey,
    queryFn: () => queryClient.getQueryData<RecordFieldsMap>(queryKey) ?? {},
    enabled: false,
    staleTime: Infinity,
  });
  // One flag for getAllRecordFields' own scope — starts `true` so a consumer's very first render
  // (before this hook has had a chance to even kick off the fetch) already reads as "loading,"
  // not "confirmed empty." Same shape useNote.tsx's own `allLoading`/`allNotesLoading` uses, for
  // the same reason: detail-task-page's field groups render against `fields.find(...)` results
  // that are empty either way (still loading, or genuinely no fields), so a consumer needs this
  // to tell those two apart and show a spinner for the former instead of flashing an "empty"
  // state while the real fields are still in flight. Genuinely local UI bookkeeping (not itself
  // fetched server data), so this stays on useSessionStore rather than moving into the query
  // cache above.
  const [allLoading, setAllLoading] = useSessionStore<boolean>(RECORD_ALL_LOADING_KEY, true);

  /**
   * Merges fetched (or shared-template, or system-default) fields into the cache without writing
   * them back if this device doesn't own them — already persisted, owned by whoever created them
   * (the three system defaults, or a shared checklist template's own private fields, resolved via
   * `GET /fields?templateId=` — see fields/index.ts's own listByTemplate). Saving them again here
   * would upsert a row with this device's `user_id` against an id whose primary key already
   * belongs to someone else, the exact "every client races to write the same global id" bug
   * CLAUDE.md warns about for `fields.id`.
   */
  const mergeRecordFields = React.useCallback(
    (fields: RecordField[]) => {
      if (!fields.length) return;
      queryClient.setQueryData<RecordFieldsMap>(queryKey, prev => {
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
    [queryClient, queryKey],
  );

  // useCallback'd (not a plain closure) so a consumer's own useSyncedSelector
  // can memoize on it — its identity now only changes when `recordFieldList`
  // itself changes, instead of on every render.
  const getAllRecordFields = React.useCallback(() => {
    const scopeKey = JSON.stringify({ userId, scope: ALL_SCOPE });
    if (ready && !fetchedScopes.has(scopeKey)) {
      fetchedScopes.add(scopeKey);
      setAllLoading(true);
      fetchRecordFields().then(result => {
        setAllLoading(false);
        if (!result) {
          fetchedScopes.delete(scopeKey);
          return;
        }
        mergeRecordFields(result.fields);
      });
    }
    return Object.values(recordFieldList);
  }, [recordFieldList, userId, ready, mergeRecordFields, setAllLoading]);

  /** Whether getAllRecordFields' own fetch is still in flight for the current identity — starts
   * `true` (see allLoading's own comment) and only flips once that fetch actually resolves, quiet
   * failure included. A consumer that never calls getAllRecordFields just carries the default
   * forever, which is fine: nothing reads this without also being one that does. */
  const allRecordFieldsLoading = allLoading;

  const getRecordFields = React.useCallback(
    (ids: string[]) => {
      return ids.map(id => recordFieldList[id]);
    },
    [recordFieldList],
  );

  /**
   * A joined challenge never forks its template's fields — every participant records against the
   * owner's exact field ids (see CLAUDE.md), and those fields stay `visibility: 'private'`, so a
   * non-owner's `getAllRecordFields` (own + public only) can never resolve them on its own.
   * `acceptChallenge` already merges them in once at join time, but that's a write into this same
   * cache — gone the moment this device's session resets (a reload, a fresh sign-in), same as
   * every other scope here, which is exactly why a participant stopped seeing a joined
   * challenge's field names on a later visit. This is the same `GET /fields?templateId=` bypass
   * the shared-template page's own `useGetChecklistTemplateApi.tsx` uses (authorized by the
   * template being public, not by the field itself) — detail-task-page calls this
   * unconditionally for whatever template it's showing, since the route is a no-op for the
   * caller's own, still-private template (it only ever returns rows once that template is
   * genuinely `visibility: 'public'`) and the merged rows show up in `getAllRecordFields`' own
   * return value once they land, both scopes sharing the one cache entry.
   */
  const getRecordFieldsByTemplateId = React.useCallback(
    (templateId: string) => {
      const scopeKey = JSON.stringify({ userId, scope: 'templateId', templateId });
      if (ready && templateId && !fetchedScopes.has(scopeKey)) {
        fetchedScopes.add(scopeKey);
        fetchRecordFieldsByTemplateId(templateId).then(result => {
          if (!result) {
            fetchedScopes.delete(scopeKey);
            return;
          }
          mergeRecordFields(result.fields);
        });
      }
      return Object.values(recordFieldList);
    },
    [recordFieldList, userId, ready, mergeRecordFields],
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
   * response directly, rather than re-reading the cache after the await —
   * the `recordFieldList` closure here is stale by the time `setQueryData`
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

  // Canonical React Query optimistic-update shape (used by both `addRecordField` and
  // `updateRecordField` below, since the wire call for either is the same upsert) — see
  // useTags.tsx's own saveTagMutation for the full rationale (per-entity rollback, no onSettled
  // refetch). `saveRecordField` is "quiet" (resolves `null` instead of rejecting on failure) —
  // `mutationFn` turns that into a real rejection, since `onError` would otherwise never fire.
  const saveRecordFieldMutation = useMutation<{ ok: true }, Error, RecordField, RollbackContext>({
    mutationFn: async field => {
      const result = await saveRecordField(field);
      if (!result) throw new Error('Failed to save field');
      return result;
    },
    onMutate: async field => {
      await queryClient.cancelQueries({ queryKey });
      const previousField = queryClient.getQueryData<RecordFieldsMap>(queryKey)?.[field.id];
      queryClient.setQueryData<RecordFieldsMap>(queryKey, prev => ({ ...prev, [field.id]: field }));
      return { previousField };
    },
    onError: (_error, field, context) => {
      queryClient.setQueryData<RecordFieldsMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        if (context?.previousField) {
          next[field.id] = context.previousField;
        } else {
          delete next[field.id];
        }
        return next;
      });
    },
  });

  const removeRecordFieldMutation = useMutation<{ ok: true }, Error, string, RollbackContext>({
    mutationFn: async id => {
      const result = await removeRecordFieldApi(id);
      if (!result) throw new Error('Failed to remove field');
      return result;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey });
      const previousField = queryClient.getQueryData<RecordFieldsMap>(queryKey)?.[id];
      queryClient.setQueryData<RecordFieldsMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return { previousField };
    },
    onError: (_error, id, context) => {
      if (!context?.previousField) return;
      const restored = context.previousField;
      queryClient.setQueryData<RecordFieldsMap>(queryKey, prev => ({ ...prev, [id]: restored }));
    },
  });

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
    saveRecordFieldMutation.mutate(field);
    return field;
  };

  const removeRecordField = (id: string) => {
    removeRecordFieldMutation.mutate(id);
  };

  const updateRecordField = (id: string, updates: Partial<RecordField>) => {
    const existing = queryClient.getQueryData<RecordFieldsMap>(queryKey)?.[id];
    if (!existing) {
      throw new Error(`Record field with id ${id} not found`);
    }
    const updatedRecord: RecordField = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    saveRecordFieldMutation.mutate(updatedRecord);
    return updatedRecord;
  };

  return {
    getAllRecordFields,
    allRecordFieldsLoading,
    getRecordFields,
    getRecordFieldsByIds,
    getRecordFieldsByTemplateId,
    addRecordField,
    removeRecordField,
    updateRecordField,
    mergeRecordFields,
  };
};
