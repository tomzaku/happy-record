import React from 'react';
import { v4 } from 'uuid';
import { format } from 'date-fns';
import { useSessionStore, useSession } from '../../hook';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import {
  fetchChecklistRecords,
  removeChecklistRecord as removeChecklistRecordApi,
  saveChecklistRecords,
  updateChecklistRecordValue,
} from './checklistRecordApi';

const CHECKLIST_RECORD_KEY = 'checklist_record';

export type ChecklistRecord = {
  id: string;
  checklistId: string;
  checklistTemplateId: string;
  createdAt: string;
  fieldId: string;
  // A metric field's own record: `number`. A note-type field's own entry (see
  // 20260829040000_notes_via_checklist_records.sql — routed to `notes` server-side, presented
  // back in this same shape): real Editor.js `OutputData`, not the narrower type — every
  // consumer hands it straight to a NoteEditor either way, same looseness `useNoteRecord.tsx`'s
  // own standalone-notebook adapter already has.
  value: number | string;
  folderId?: string;
  /** Only ever real for a note-type field's own entry (a checklist journal entry, or the
   * standalone notebook's own notes-as-ChecklistRecord adapter in useNoteRecord.tsx) — a metric
   * record has no title of its own. See `Note['title']` (useNote.tsx) for where this actually
   * comes from. */
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

// Records are unbounded (every day, forever), so this fetches only the one
// range it's actually asked for, keyed so the same (identity, template,
// range, fields) tuple isn't re-fetched every call within a page load —
// this is the shape every other resource's read function now follows too
// (see CLAUDE.md's "online-first data layer"). `userId` is part of the key
// (not just a page-load guard) so a range already fetched for one identity
// re-fetches once the signed-in identity actually changes.
const syncedRanges = new Set<string>();

export const useChecklistRecord = () => {
  const [checklistRecordList, setChecklistRecordList] =
    useSessionStore<ChecklistRecorStore>(CHECKLIST_RECORD_KEY, {});
  const { userId, ready } = useSession();

  const addChecklistRecord = (data: AddChecklistRecordData) => {
    if (data.records.length) {
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

      setChecklistRecordList(prev => ({
        ...prev,
        [data.checklistTemplateId]: [
          ...(prev[data.checklistTemplateId] || []),
          ...result,
        ],
      }));
      saveChecklistRecords({
        records: result,
        checklistId: data.checklistId,
        checklistTemplateId: data.checklistTemplateId,
        createdAt: data.createdAt,
        submissionId,
      });
      return result;
    }
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
    }: {
      rangeDate?: { from: string; to: string };
      type?: 'date' | 'time';
      fieldIds?: string[];
      sortBy?: 'createdAt';
      sortDirection?: 'asc' | 'desc';
    },
  ) => {
    // Background sync for this exact range — merges into the store when it
    // lands, so it's visible next time this range is read (e.g. the next
    // time this component mounts), not necessarily in the result returned
    // below. See CLAUDE.md: null (offline, no backend) just means "use what
    // this device already has", which is exactly what happens if this never
    // resolves. Waits for `ready` so this doesn't fire against whatever
    // transient session exists before the real one settles.
    const rangeKey = JSON.stringify({ userId, checklistTemplateId, rangeDate, fieldIds });
    if (ready && !syncedRanges.has(rangeKey)) {
      syncedRanges.add(rangeKey);
      fetchChecklistRecords({
        checklistTemplateId: checklistTemplateId || undefined,
        from: rangeDate?.from,
        to: rangeDate?.to,
        fieldIds,
      }).then(result => {
        if (!result) {
          syncedRanges.delete(rangeKey);
          return;
        }
        setChecklistRecordList(prev => {
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
  }, [checklistRecordList, userId, ready, setChecklistRecordList]);

  const updateChecklistRecord = (
    recordId: string,
    {
      value,
      title,
      checklistTemplateId,
      folderId,
    }: {
      // Optional — a note-type field's own title-only edit (ChecklistFieldGeneral) touches
      // nothing else. A metric field's own edit always sends this.
      value?: number | string;
      title?: string;
      checklistTemplateId: string;
      folderId?: string;
    },
  ) => {
    setChecklistRecordList(prev => {
      // Get the existing records for the given checklistTemplateId
      const existingRecords = prev[checklistTemplateId] || [];

      // Update the record with the matching id
      const updatedRecords = existingRecords.map(record => {
        if (record.id === recordId) {
          return {
            ...record,
            ...(value !== undefined && { value }),
            ...(title !== undefined && { title }),
            ...(folderId !== undefined && { folderId }),
            updatedAt: new Date().toISOString(),
          };
        }
        return record;
      });

      return {
        ...prev,
        [checklistTemplateId]: updatedRecords,
      };
    });
    updateChecklistRecordValue(recordId, { value, title, folderId });
  };

  return {
    addChecklistRecord,
    getChecklistRecords,
    updateChecklistRecord,
    deleteChecklistRecord: (
      recordId: string,
      { checklistTemplateId }: { checklistTemplateId: string },
    ) => {
      setChecklistRecordList(prev => {
        const existingRecords = prev[checklistTemplateId] || [];
        const updatedRecords = existingRecords.filter(
          record => record.id !== recordId,
        );
        return {
          ...prev,
          [checklistTemplateId]: updatedRecords,
        };
      });
      removeChecklistRecordApi(recordId);
    },
  };
};
