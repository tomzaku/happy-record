import React from 'react';
import { useNote, type Note } from '@dreamer/global/src/store/note/useNote';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import { useChecklistTemplates } from '@dreamer/global/src/store/checklists/useChecklistTemplates';
import { useSyncedSelector } from '@dreamer/global/src/hook';
import type { RecordField } from '@dreamer/global/src/store/record-field';

// A brand-new, genuinely empty Editor.js document — same shape `@editorjs/editorjs` itself
// produces from `.save()` on an untouched instance, not `undefined`/`null` (NoteEditor's own
// `value` prop expects real OutputData once a note exists, even with nothing written yet).
const EMPTY_NOTE_VALUE = { time: Date.now(), blocks: [], version: '2.31.6' };

export type FolderRef =
  | { kind: 'field'; id: string }
  | { kind: 'task'; id: string }
  | { kind: 'other' };

/** Which folder a note belongs to — a real checklist template id (a journal entry, or a
 * field-group's own Home note; both set `checklistTemplateId`, see useNote.tsx's own
 * `NoteOrigin`) buckets it under that task; nothing set means the standalone notebook's own
 * per-field note. A `checklistTemplateId` that doesn't resolve to a template this device knows
 * about (a deleted template, most likely) falls back to `other` rather than silently vanishing —
 * the note itself is real, just its folder isn't resolvable right now. */
const folderOf = (note: Note, knownTemplateIds: Set<string>): FolderRef => {
  if (note.checklistTemplateId) {
    return knownTemplateIds.has(note.checklistTemplateId)
      ? { kind: 'task', id: note.checklistTemplateId }
      : { kind: 'other' };
  }
  return { kind: 'field', id: note.ownerId };
};

const sameFolder = (a: FolderRef, b: FolderRef): boolean =>
  a.kind === 'other' ? b.kind === 'other' : a.kind === b.kind && a.id === b.id;

/**
 * The shared state behind both index.tsx (mobile) and index.desktop.tsx.
 *
 * Every note this user owns shows up here now, not just the standalone notebook's own one this
 * page originally showed — a checklist journal entry (a `type: 'note'` field's own value inside
 * a checklist, one row per Submit) and a field-group's own persistent Home note are both real
 * rows in the same `notes` table (see useNote.tsx's own doc comment), just created and edited
 * from a different surface. `getAllNotes` (useNote.tsx) reads all three in one call; `folderOf`
 * above is what sorts them back out for the sidebar/list without needing three separate fetches
 * or three separate "kind of note" code paths — reading, editing, and deleting all go through
 * the exact same `useNote()` functions regardless of which surface a given note came from.
 *
 * "New Note" (`startCompose`/`chooseComposeField`) is the one thing that's still standalone-only
 * — a journal entry only ever gets created from a checklist's own Submit form, and a field-group
 * note from that group's own Home tab; this page can't originate either, only show and edit them
 * once they exist. Same one-note-per-field limit as before applies to what "+" can create (see
 * useNoteRecord.tsx's own doc comment).
 */
export const useNoteManagerState = () => {
  const { getNote, getAllNotes, updateNote: updateNoteApi, deleteNote: deleteNoteApi } = useNote();
  const { getAllNoteFields, addNote } = useNoteRecords();
  const { getRecommendChecklistTemplates } = useChecklistTemplates();

  const allNotes = useSyncedSelector(getAllNotes);
  const allNoteFields = useSyncedSelector(getAllNoteFields);
  const allTemplates = useSyncedSelector(getRecommendChecklistTemplates);

  const [selectedFolder, setSelectedFolder] = React.useState<FolderRef | null>(null);
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  // True while the editor pane is showing the "pick where to save this" chooser — a note hasn't
  // actually been created yet at this point (see startCompose's own comment).
  const [composing, setComposing] = React.useState(false);

  const fieldMap = React.useMemo(
    () => new Map(allNoteFields.map(field => [field.id, field])),
    [allNoteFields],
  );
  const templateMap = React.useMemo(
    () => new Map(allTemplates.map(template => [template.id, template])),
    [allTemplates],
  );
  const templateIds = React.useMemo(() => new Set(templateMap.keys()), [templateMap]);

  // Task folders — only templates that actually have a note in them (a journal entry or a Home
  // note), not every checklist template the user has, most of which never have one.
  const taskFolderIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const note of allNotes) {
      const ref = folderOf(note, templateIds);
      if (ref.kind === 'task') ids.add(ref.id);
    }
    return ids;
  }, [allNotes, templateIds]);
  const hasOtherNotes = React.useMemo(
    () => allNotes.some(note => folderOf(note, templateIds).kind === 'other'),
    [allNotes, templateIds],
  );

  const notes = React.useMemo(() => {
    const filtered = selectedFolder
      ? allNotes.filter(note => sameFolder(folderOf(note, templateIds), selectedFolder))
      : allNotes;
    // getAllNotes already sorts by updatedAt desc, but a note edited via a different scoped
    // fetch (getNote/getNotesByIds landing a fresher copy) can leave the store's own insertion
    // order stale — cheap enough to just re-sort the already-small filtered set here.
    return [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [allNotes, selectedFolder, templateIds]);

  // getNote fetches this note's own full content (`value` included) the moment it's selected —
  // the list itself only ever holds a summary (see useNote.tsx's own getAllNotes comment) —
  // and exposes `loading` for the brief window before it lands, so the editor pane can show a
  // loading state instead of rendering a blank NoteEditor for `value: undefined`.
  const { note: selectedNote, loading: selectedNoteLoading } = getNote(selectedNoteId ?? undefined);
  const emptyFields = React.useMemo(() => allNoteFields.filter(f => !f.noteId), [allNoteFields]);

  // FolderSidebar's own "Tasks" section — resolved title/icon per task folder, once here rather
  // than in both entry files.
  const taskFolders = React.useMemo(
    () =>
      [...taskFolderIds].map(id => {
        const template = templateMap.get(id);
        return {
          id,
          title: template?.title ?? 'Task',
          icon: template?.avatar?.name || 'solar:checklist-line-duotone',
        };
      }),
    [taskFolderIds, templateMap],
  );

  const folderTitle = React.useCallback(
    (folder: FolderRef | null): string => {
      if (!folder) return 'All Notes';
      if (folder.kind === 'other') return 'Other';
      if (folder.kind === 'field') return fieldMap.get(folder.id)?.title ?? 'Notes';
      return templateMap.get(folder.id)?.title ?? 'Task';
    },
    [fieldMap, templateMap],
  );
  const selectedFolderTitle = folderTitle(selectedFolder);
  const selectedNoteSourceLabel = selectedNote ? folderTitle(folderOf(selectedNote, templateIds)) : undefined;
  // A journal entry or a field-group's own Home note came *from* a checklist template — this is
  // the link back to it, landed on the exact day the note itself is from (a journal entry's own
  // `checklistId` — that day's real checklist instance — when there is one, else just the date;
  // detail-task-page resolves `currentDay` either way). `undefined` for a standalone field note
  // (nothing to link to) and for an `other`-bucketed one (the template itself doesn't resolve,
  // so a link would 404).
  const selectedNoteSourceHref = React.useMemo(() => {
    if (!selectedNote?.checklistTemplateId || !templateMap.has(selectedNote.checklistTemplateId)) {
      return undefined;
    }
    const params = new URLSearchParams({ currentDay: selectedNote.createdAt });
    if (selectedNote.checklistId) params.set('checklistId', selectedNote.checklistId);
    return `/task/${selectedNote.checklistTemplateId}?${params.toString()}`;
  }, [selectedNote, templateMap]);

  const selectFolder = (folder: FolderRef | null) => {
    setSelectedFolder(folder);
    setSelectedNoteId(null);
    setComposing(false);
  };

  const selectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    setComposing(false);
  };

  /** The mobile "back from a note" gesture — closes whatever's open in the editor pane without
   * touching which folder is selected, unlike `selectFolder`'s own reset. Desktop never calls
   * this (its editor pane just sits empty, no separate screen to leave). */
  const closeNote = () => {
    setSelectedNoteId(null);
    setComposing(false);
  };

  /** Creates `field.id`'s one standalone note right now, blank, and selects it — safe any time a
   * field has no `noteId` yet (its one slot is free). Lands the sidebar/list on that field's own
   * folder too, so what's now open in the editor stays visible regardless of the filter that was
   * active before. */
  const createNoteIn = async (field: RecordField) => {
    const created = await addNote(field.id, EMPTY_NOTE_VALUE, '');
    const note = created[0];
    setComposing(false);
    if (note) {
      setSelectedFolder({ kind: 'field', id: field.id });
      setSelectedNoteId(note.id);
    }
    return note;
  };

  /** The "+" button. No ambiguity → just create (0 fields: nothing to do, the button is disabled
   * for this case by the caller; 1 empty field: that's obviously where it goes). More than one
   * candidate → `composing` turns on instead, so the editor pane can show the picker
   * (`chooseComposeField` is what actually creates once someone picks). */
  const startCompose = () => {
    if (emptyFields.length === 0) return;
    if (emptyFields.length === 1) {
      createNoteIn(emptyFields[0]);
      return;
    }
    setSelectedNoteId(null);
    setComposing(true);
  };

  const chooseComposeField = (field: RecordField) => createNoteIn(field);

  const cancelCompose = () => setComposing(false);

  const updateSelectedNoteValue = (value: unknown) => {
    if (!selectedNote) return;
    updateNoteApi(selectedNote.id, { value });
  };

  const updateSelectedNoteTitle = (title: string) => {
    if (!selectedNote) return;
    updateNoteApi(selectedNote.id, { title });
  };

  const deleteNote = (note: Note) => {
    deleteNoteApi(note.id);
    if (note.id === selectedNoteId) setSelectedNoteId(null);
  };

  return {
    allNoteFields,
    fieldMap,
    templateMap,
    taskFolders,
    hasOtherNotes,
    emptyFields,
    notes,
    totalNoteCount: allNotes.length,
    selectedFolder,
    selectedFolderTitle,
    selectedNote,
    selectedNoteLoading,
    selectedNoteSourceLabel,
    selectedNoteSourceHref,
    composing,
    selectFolder,
    selectNote,
    closeNote,
    startCompose,
    chooseComposeField,
    cancelCompose,
    updateSelectedNoteValue,
    updateSelectedNoteTitle,
    deleteNote,
  };
};

export { folderOf };
