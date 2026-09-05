import React from 'react';
import { v4 } from 'uuid';
import { format } from 'date-fns';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook';
import { checklistLogsKeys } from '../checklist-logs/checklistLogsKeys';
import { checklistRecordsKeys } from './checklistRecordsKeys';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import {
  fetchChecklistRecords,
  removeChecklistRecord as removeChecklistRecordApi,
  saveChecklistRecords,
  updateChecklistRecordValue,
} from './checklistRecordApi';

export type ChecklistRecord = {
  id: string;
  checklistId: string;
  checklistTemplateId: string;
  createdAt: string;
  fieldId: string;
  // A number field's own record: `number`. text/date/datetime: `string`. A note-type field's own
  // entry (see 20260829040000_notes_via_checklist_records.sql — routed to `notes` server-side,
  // presented back in this same shape): real Editor.js `OutputData`, not the narrower type —
  // every consumer hands it straight to a NoteEditor either way, same looseness
  // `useNoteRecord.tsx`'s own standalone-notebook adapter already has.
  value: number | string;
  folderId?: string;
  /** Only ever real for a note-type field's own entry (a checklist journal entry, or the
   * standalone notebook's own notes-as-ChecklistRecord adapter in useNoteRecord.tsx) — a
   * number/text/date/datetime record has no title of its own. See `Note['title']` (useNote.tsx)
   * for where this actually comes from. */
  title?: string;
  /**
   * One id per Submit click, shared by every field submitted in that click
   * — the real "these were committed together" relationship (see
   * getChecklistRecords' `type: 'time'` grouping below). Optional only for
   * back-compat with anything written before this existed; `addChecklistRecord`
   * always sets it.
   */
  submissionId?: string;
  updatedAt: string;
};

// Since we store in FE we might need nest the data to queries faster
type ChecklistRecorStore = {
  [checklistTemplateId: string]: ChecklistRecord[];
};

type AddChecklistRecordData = {
  records: {
    fieldId: string;
    value: number | string;
    folderId?: string;
    /** A note-type field's own entry only — see ChecklistRecord['title']'s own comment. */
    title?: string;
  }[];
  checklistId: string;
  checklistTemplateId: string;
  createdAt: string;
};

type AddChecklistRecordBatch = {
  records: ChecklistRecord[];
  checklistId: string;
  checklistTemplateId: string;
  createdAt: string;
  submissionId: string;
};

type UpdateChecklistRecordArgs = {
  recordId: string;
  checklistTemplateId: string;
  value?: number | string;
  title?: string;
  folderId?: string;
};

// Records are unbounded (every day, forever), so this fetches only the one
// range it's actually asked for, keyed so the same (identity, template,
// range, fields) tuple isn't re-fetched every call within a page load —
// this is the shape every other resource's read function now follows too
// (see CLAUDE.md's "online-first data layer"). `userId` is part of the key
// (not just a page-load guard) so a range already fetched for one identity
// re-fetches once the signed-in identity actually changes.
const syncedRanges = new Set<string>();

export const useChecklistRecord = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = checklistRecordsKeys.store(userId);

  // The shared checklist-records cache, backed by React Query instead of useSessionStore — same
  // "one cache entry, several imperative scoped fetches merging into it" shape as useNote.tsx's
  // own notes cache (see checklistRecordsKeys.ts's own comment on why). `enabled: false` since
  // nothing auto-fetches this query itself; getChecklistRecords' own background sync below is
  // what actually populates it, via setQueryData.
  const { data: checklistRecordList = {} } = useQuery<ChecklistRecorStore>({
    queryKey,
    queryFn: () => queryClient.getQueryData<ChecklistRecorStore>(queryKey) ?? {},
    enabled: false,
    staleTime: Infinity,
  });

  const invalidateChecklistLogs = () => queryClient.invalidateQueries({ queryKey: checklistLogsKeys.all });

  // `addChecklistRecord`'s own mutation — one Submit click's whole batch is the unit of work,
  // not one record. Rollback removes exactly the ids this batch added (not a snapshot restore —
  // see useTags.tsx's own comment on why a snapshot can clobber a concurrent sibling write; here
  // that'd be a second Submit click landing for the same template while this one's save is still
  // in flight), so it can't touch anything a different batch added to the same template.
  const addChecklistRecordMutation = useMutation<{ ok: true }, Error, AddChecklistRecordBatch>({
    mutationFn: async batch => {
      const result = await saveChecklistRecords(batch);
      if (!result) throw new Error('Failed to save checklist records');
      return result;
    },
    onMutate: async batch => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<ChecklistRecorStore>(queryKey, prev => ({
        ...prev,
        [batch.checklistTemplateId]: [...(prev?.[batch.checklistTemplateId] ?? []), ...batch.records],
      }));
    },
    onError: (_error, batch) => {
      const ids = new Set(batch.records.map(record => record.id));
      queryClient.setQueryData<ChecklistRecorStore>(queryKey, prev => {
        const bucket = prev?.[batch.checklistTemplateId];
        if (!bucket) return prev;
        return { ...prev, [batch.checklistTemplateId]: bucket.filter(record => !ids.has(record.id)) };
      });
    },
    onSuccess: () => invalidateChecklistLogs(),
  });

  const addChecklistRecord = (data: AddChecklistRecordData) => {
    if (!data.records.length) return;
    // One id for the whole click, not per field — every record below
    // shares it, which is what makes them "one commit" rather than a
    // coincidence of matching timestamps.
    const submissionId = v4();
    const result = data.records.map(record => ({
      id: v4(),
      ...record,
      checklistId: data.checklistId,
      checklistTemplateId: data.checklistTemplateId,
      createdAt: data.createdAt,
      submissionId,
      updatedAt: data.createdAt,
    }));

    addChecklistRecordMutation.mutate({
      records: result,
      checklistId: data.checklistId,
      checklistTemplateId: data.checklistTemplateId,
      createdAt: data.createdAt,
      submissionId,
    });
    return result;
  };

  // useCallback'd (not a plain closure) so a consumer's own useSyncedSelector
  // can memoize on it — its identity now only changes when the data it
  // actually reads (`checklistRecordList`, `userId`, `ready`) changes,
  // instead of on every render.
  const getChecklistRecords = React.useCallback((
    checklistTemplateId: string,
    {
      rangeDate,
      type = 'date',
      fieldIds,
      sortBy,
      sortDirection = 'asc',
      limit,
    }: {
      rangeDate?: { from: string; to: string };
      type?: 'date' | 'time';
      fieldIds?: string[];
      sortBy?: 'createdAt';
      sortDirection?: 'asc' | 'desc';
      /** Caps how many records feed the returned groups, applied after
       * sorting — e.g. "last 20 across every template" for a home-page
       * widget. Also threaded into the background fetch below so the
       * server-side query itself is bounded, not just the client-side
       * read. */
      limit?: number;
    },
  ) => {
    // Background sync for this exact range — merges into the cache when it
    // lands, so it's visible next time this range is read (e.g. the next
    // time this component mounts), not necessarily in the result returned
    // below. See CLAUDE.md: null (offline, no backend) just means "use what
    // this device already has", which is exactly what happens if this never
    // resolves. Waits for `ready` so this doesn't fire against whatever
    // transient session exists before the real one settles.
    const rangeKey = JSON.stringify({ userId, checklistTemplateId, rangeDate, fieldIds, limit });
    if (ready && !syncedRanges.has(rangeKey)) {
      syncedRanges.add(rangeKey);
      fetchChecklistRecords({
        checklistTemplateId: checklistTemplateId || undefined,
        from: rangeDate?.from,
        to: rangeDate?.to,
        fieldIds,
        limit,
      }).then(result => {
        if (!result) {
          syncedRanges.delete(rangeKey);
          return;
        }
        queryClient.setQueryData<ChecklistRecorStore>(queryKey, prev => {
          const merged = { ...prev };
          let changed = false;
          for (const record of result.records) {
            const bucket = merged[record.checklistTemplateId] ?? [];
            const existingIndex = bucket.findIndex(r => r.id === record.id);
            if (existingIndex === -1) {
              merged[record.checklistTemplateId] = [...bucket, record];
              changed = true;
            } else if (
              new Date(record.updatedAt) > new Date(bucket[existingIndex].updatedAt)
            ) {
              // Last-write-wins by `updatedAt`, not "add if missing": an edit
              // to a record's value on another device needs to actually
              // arrive here, not be silently ignored because this device
              // already has *an* entry for that id — cheap safety even
              // though a direct scoped fetch makes this rarer to hit.
              const nextBucket = [...bucket];
              nextBucket[existingIndex] = record;
              merged[record.checklistTemplateId] = nextBucket;
              changed = true;
            }
          }
          return changed ? merged : prev;
        });
      });
    }

    const records = checklistTemplateId
      ? checklistRecordList[checklistTemplateId] || []
      : Object.values(checklistRecordList).flat();
    let filteredRecords = records;
    if (rangeDate) {
      filteredRecords = records.filter(record => {
        const recordDate = new Date(record.createdAt);
        return (
          recordDate >= new Date(rangeDate.from) &&
          recordDate <= new Date(rangeDate.to)
        );
      });
    }

    if (fieldIds && fieldIds.length) {
      filteredRecords = filteredRecords.filter(record =>
        fieldIds.includes(record.fieldId),
      );
    }

    // Sorting
    if (sortBy) {
      switch (sortBy) {
        case 'createdAt': {
          filteredRecords = filteredRecords.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
          });
          break;
        }
      }
    }
    if (sortDirection === 'desc') {
      filteredRecords = filteredRecords.reverse();
    }

    if (limit) {
      filteredRecords = filteredRecords.slice(0, limit);
    }

    let groupsByDay: Record<string, ChecklistRecord[]>;
    if (type === 'date') {
      // Group records by day (YYYY-MM-DD format) — every submission on the
      // same day belongs in one bucket here, so this stays keyed by the
      // calendar day, not by submission.
      groupsByDay = filteredRecords.reduce<Record<string, ChecklistRecord[]>>(
        (acc, record) => {
          const dayKey = format(new Date(record.createdAt), 'yyyy-MM-dd');
          acc[dayKey] = [...(acc[dayKey] || []), record];
          return acc;
        },
        {},
      );
    } else {
      // Group by submissionId — the real "committed together" relationship
      // — not by createdAt equality (see addChecklistRecord). Falls back to
      // the record's own id for anything written before submissionId
      // existed, so it becomes its own singleton group rather than
      // colliding with something unrelated.
      //
      // The returned map is still keyed by a parseable date string (each
      // group's own createdAt) because callers (ChecklistFieldGroupHistory,
      // RecordDayHistory) display the key as one — two
      // submissions landing in the exact same millisecond would still
      // collide at that display step, same residual edge case as before,
      // just no longer the thing grouping (and "delete this entry")
      // actually relies on.
      const bySubmission = new Map<string, ChecklistRecord[]>();
      for (const record of filteredRecords) {
        const groupId = record.submissionId || record.id;
        const group = bySubmission.get(groupId);
        if (group) group.push(record);
        else bySubmission.set(groupId, [record]);
      }
      groupsByDay = {};
      for (const group of bySubmission.values()) {
        groupsByDay[new Date(group[0].createdAt).toISOString()] = group;
      }
    }

    return groupsByDay;
  }, [checklistRecordList, userId, ready, queryClient, queryKey]);

  // Per-entity rollback (used by both updateChecklistRecord and deleteChecklistRecord below) —
  // finds the one record by id inside its own checklistTemplateId's array. Sharing this between
  // the two isn't practical the way saveTagMutation's single mutation is shared by add/update
  // (an update always has a previous value to restore; a delete's "previous" is the record
  // being removed) — kept as two mutations instead, same rollback shape either way.
  const updateChecklistRecordMutation = useMutation<
    { ok: true },
    Error,
    UpdateChecklistRecordArgs,
    { previousRecord: ChecklistRecord | undefined }
  >({
    mutationFn: async ({ recordId, value, title, folderId }) => {
      const result = await updateChecklistRecordValue(recordId, { value, title, folderId });
      if (!result) throw new Error('Failed to update checklist record');
      return result;
    },
    onMutate: async ({ recordId, checklistTemplateId, value, title, folderId }) => {
      await queryClient.cancelQueries({ queryKey });
      const bucket = queryClient.getQueryData<ChecklistRecorStore>(queryKey)?.[checklistTemplateId] ?? [];
      const previousRecord = bucket.find(record => record.id === recordId);
      queryClient.setQueryData<ChecklistRecorStore>(queryKey, prev => {
        const existingRecords = prev?.[checklistTemplateId] ?? [];
        return {
          ...prev,
          [checklistTemplateId]: existingRecords.map(record =>
            record.id === recordId
              ? {
                ...record,
                ...(value !== undefined && { value }),
                ...(title !== undefined && { title }),
                ...(folderId !== undefined && { folderId }),
                updatedAt: new Date().toISOString(),
              }
              : record,
          ),
        };
      });
      return { previousRecord };
    },
    onError: (_error, { recordId, checklistTemplateId }, context) => {
      if (!context?.previousRecord) return;
      const restored = context.previousRecord;
      queryClient.setQueryData<ChecklistRecorStore>(queryKey, prev => {
        const bucket = prev?.[checklistTemplateId] ?? [];
        return {
          ...prev,
          [checklistTemplateId]: bucket.map(record => (record.id === recordId ? restored : record)),
        };
      });
    },
  });

  const updateChecklistRecord = (
    recordId: string,
    args: {
      value?: number | string;
      title?: string;
      checklistTemplateId: string;
      folderId?: string;
    },
  ) => {
    updateChecklistRecordMutation.mutate({ recordId, ...args });
  };

  const removeChecklistRecordMutation = useMutation<
    { ok: true },
    Error,
    { recordId: string; checklistTemplateId: string },
    { previousRecord: ChecklistRecord | undefined }
  >({
    mutationFn: async ({ recordId }) => {
      const result = await removeChecklistRecordApi(recordId);
      if (!result) throw new Error('Failed to remove checklist record');
      return result;
    },
    onMutate: async ({ recordId, checklistTemplateId }) => {
      await queryClient.cancelQueries({ queryKey });
      const bucket = queryClient.getQueryData<ChecklistRecorStore>(queryKey)?.[checklistTemplateId] ?? [];
      const previousRecord = bucket.find(record => record.id === recordId);
      queryClient.setQueryData<ChecklistRecorStore>(queryKey, prev => {
        const existingRecords = prev?.[checklistTemplateId] ?? [];
        return {
          ...prev,
          [checklistTemplateId]: existingRecords.filter(record => record.id !== recordId),
        };
      });
      return { previousRecord };
    },
    onError: (_error, { checklistTemplateId }, context) => {
      if (!context?.previousRecord) return;
      const restored = context.previousRecord;
      queryClient.setQueryData<ChecklistRecorStore>(queryKey, prev => {
        const bucket = prev?.[checklistTemplateId] ?? [];
        return { ...prev, [checklistTemplateId]: [...bucket, restored] };
      });
    },
  });

  return {
    addChecklistRecord,
    getChecklistRecords,
    updateChecklistRecord,
    deleteChecklistRecord: (
      recordId: string,
      { checklistTemplateId }: { checklistTemplateId: string },
    ) => {
      removeChecklistRecordMutation.mutate({ recordId, checklistTemplateId });
    },
  };
};
