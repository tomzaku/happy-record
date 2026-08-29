import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNote, type Note } from '@dreamer/global/src/store/note/useNote';
import { useNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import { useNoteFolder } from '@dreamer/global/src/store/note-folder/useNoteFolder';
import { useChecklistTemplates } from '@dreamer/global/src/store/checklists/useChecklistTemplates';
import { useRecordField, type RecordField } from '@dreamer/global/src/store/record-field';
import { useSyncedSelector } from '@dreamer/global/src/hook';

// A brand-new, genuinely empty Editor.js document — same shape `@editorjs/editorjs` itself
// produces from `.save()` on an untouched instance, not `undefined`/`null` (NoteEditor's own
// `value` prop expects real OutputData once a note exists, even with nothing written yet).
const EMPTY_NOTE_VALUE = { time: Date.now(), blocks: [], version: '2.31.6' };

export type FolderRef =
  | { kind: 'field'; id: string }
  | { kind: 'task'; id: string }
  | { kind: 'noteFolder'; id: string }
  | { kind: 'other' };

/** Which folder a note belongs to. A real, user-created folder (`note.folderId` — the
 * `note-folders` resource, see useNoteFolder.tsx) always wins when set: it's an explicit choice
 * someone made for that one note, not something to second-guess against where the note
 * structurally came from. Absent that, a real checklist template id (a journal entry, or a
 * field-group's own Home note; both set `checklistTemplateId`, see useNote.tsx's own
 * `NoteOrigin`) buckets it under that task; nothing set means the standalone notebook's own
 * per-field note. A `checklistTemplateId` that doesn't resolve to a template this device knows
 * about (a deleted template, most likely) falls back to `other` rather than silently vanishing —
 * the note itself is real, just its folder isn't resolvable right now. */
const folderOf = (note: Note, knownTemplateIds: Set<string>): FolderRef => {
  if (note.folderId) return { kind: 'noteFolder', id: note.folderId };
  if (note.checklistTemplateId) {
    return knownTemplateIds.has(note.checklistTemplateId)
      ? { kind: 'task', id: note.checklistTemplateId }
      : { kind: 'other' };
  }
  return { kind: 'field', id: note.ownerId };
};

const sameFolder = (a: FolderRef, b: FolderRef): boolean =>
  a.kind === 'other' ? b.kind === 'other' : a.kind === b.kind && a.id === b.id;

/** One note-type field's own records, grouped, inside a Task folder — see `taskFieldClusters`
 * below. There's deliberately no "parent note" here: a field's own persistent, checklistId-less
 * note only ever exists for the standalone notebook (see useNote.tsx's own doc comment on
 * `checklistId`), so a field used purely for per-day journaling inside a checklist has nothing
 * of its own to open — `title`/`icon` (falling back when this device hasn't loaded the field
 * itself — a deleted field, most likely) exist purely to label the group, not to open anything;
 * clicking it shows `records` as a picker instead (NoteEditorPane's own "field menu" state). */
export type NoteFieldCluster = {
  fieldId: string;
  title: string;
  icon: string;
  records: Note[];
};

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
  const {
    getNote,
    getAllNotes,
    allNotesLoading,
    updateNote: updateNoteApi,
    deleteNote: deleteNoteApi,
  } = useNote();
  const { getAllNoteFields, addNote } = useNoteRecords();
  const { getRecommendChecklistTemplates } = useChecklistTemplates();
  const { getAllNoteFolders, addNoteFolder } = useNoteFolder();
  const { addRecordField } = useRecordField();

  const allNotes = useSyncedSelector(getAllNotes);
  const allNoteFields = useSyncedSelector(getAllNoteFields);
  const allTemplates = useSyncedSelector(getRecommendChecklistTemplates);
  const allNoteFolders = useSyncedSelector(getAllNoteFolders);

  // `?id=` is the open note's own id, kept in sync both ways: selecting a note writes it here
  // (setNoteId below) so the URL is always shareable/refreshable/back-button-able, and a `?id=`
  // that arrives from outside this page's own clicks (a fresh deep link, browser back/forward,
  // another page's own link built with `?id=` — e.g. a "jump to this note" link elsewhere in the
  // app) opens that note and resolves its sidebar folder on load, below.
  const [searchParams, setSearchParams] = useSearchParams();
  const urlNoteId = searchParams.get('id');

  const [selectedFolder, setSelectedFolder] = React.useState<FolderRef | null>(null);
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);
  // Which field's own record-picker menu is showing — set only inside a Task folder, and
  // mutually exclusive with `selectedNoteId`/`composing` (see the setters below, which all clear
  // whichever of the three isn't theirs). See NoteFieldCluster's own comment for why this exists
  // instead of just being another note to select.
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  // True while the editor pane is showing the "pick where to save this" chooser — a note hasn't
  // actually been created yet at this point (see startCompose's own comment).
  const [composing, setComposing] = React.useState(false);

  // Every place below that opens/closes a note goes through this instead of the raw setter, so
  // `?id=` never drifts out of sync with what's actually open. `replace: true` — selecting note
  // after note is a within-page navigation, not a new history entry; a whole *browser* back
  // press should leave the page, not step backwards one note at a time.
  const setNoteId = (id: string | null) => {
    setSelectedNoteId(id);
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        if (id) next.set('id', id);
        else next.delete('id');
        return next;
      },
      { replace: true },
    );
  };

  const fieldMap = React.useMemo(
    () => new Map(allNoteFields.map(field => [field.id, field])),
    [allNoteFields],
  );
  const templateMap = React.useMemo(
    () => new Map(allTemplates.map(template => [template.id, template])),
    [allTemplates],
  );
  const templateIds = React.useMemo(() => new Set(templateMap.keys()), [templateMap]);
  const noteFolderMap = React.useMemo(
    () => new Map(allNoteFolders.map(folder => [folder.id, folder])),
    [allNoteFolders],
  );

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

  const isTaskFolder = selectedFolder?.kind === 'task';

  // Inside a Task folder, split `notes` (already filtered to this one task) into the group's own
  // flat rows (a field-group's persistent Home note — one per group, nothing to nest under it)
  // and per-field clusters (every note-type field's own records, grouped by which field owns
  // them — see NoteFieldCluster's own comment). Empty arrays outside a Task folder; NoteList only
  // renders this shape when `groupByField` is set, so nothing consumes it otherwise.
  const { taskFieldGroupNotes, taskFieldClusters } = React.useMemo(() => {
    if (!isTaskFolder) return { taskFieldGroupNotes: [] as Note[], taskFieldClusters: [] as NoteFieldCluster[] };
    const fieldGroupNotes: Note[] = [];
    const byField = new Map<string, Note[]>();
    for (const note of notes) {
      if (note.ownerType === 'field_group') {
        fieldGroupNotes.push(note);
        continue;
      }
      const records = byField.get(note.ownerId) ?? [];
      records.push(note);
      byField.set(note.ownerId, records);
    }
    const clusters: NoteFieldCluster[] = [...byField.entries()].map(([fieldId, records]) => {
      const field = fieldMap.get(fieldId);
      return {
        fieldId,
        title: field?.title ?? 'Notes',
        icon: field?.icon || 'solar:notebook-line-duotone',
        // Chronological, not most-recently-edited-first — "Day 1" before "Day 2" reads the way a
        // journal actually happened, unlike the group/flat-list ordering above which is about
        // surfacing recent activity, not narrative order.
        records: [...records].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      };
    });
    return { taskFieldGroupNotes: fieldGroupNotes, taskFieldClusters: clusters };
  }, [isTaskFolder, notes, fieldMap]);

  const selectedFieldCluster = React.useMemo(
    () => (selectedFieldId ? taskFieldClusters.find(c => c.fieldId === selectedFieldId) : undefined),
    [selectedFieldId, taskFieldClusters],
  );

  // A URL with `?id=` pointing at a note this page hasn't already opened — a fresh deep link,
  // the browser's own back/forward, or another page's own link built with `?id=` — opens it.
  // The ref (not just comparing `urlNoteId` to `selectedNoteId`) is what makes this fire exactly
  // once per distinct incoming id rather than on every render where the two happen to differ —
  // it's also what the folder-resolving effect below keys off of, to tell "this note came from
  // the URL, go resolve its folder too" apart from "this note came from a normal in-page click,
  // which already sits in the right folder."
  const urlOpenedIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!urlNoteId || urlNoteId === urlOpenedIdRef.current) return;
    urlOpenedIdRef.current = urlNoteId;
    setSelectedNoteId(urlNoteId);
    setSelectedFieldId(null);
    setComposing(false);
  }, [urlNoteId]);

  // getNote fetches this note's own full content (`value` included) the moment it's selected —
  // the list itself only ever holds a summary (see useNote.tsx's own getAllNotes comment) —
  // and exposes `loading` for the brief window before it lands, so the editor pane can show a
  // loading state instead of rendering a blank NoteEditor for `value: undefined`.
  const { note: selectedNote, loading: selectedNoteLoading } = getNote(selectedNoteId ?? undefined);
  const emptyFields = React.useMemo(() => allNoteFields.filter(f => !f.noteId), [allNoteFields]);

  // Once a `?id=`-opened note's own content actually lands, resolve which sidebar folder it
  // belongs to and select it — the URL alone can't tell us that; `folderOf` needs the note's own
  // ownerType/ownerId/checklistTemplateId, which only exist once `getNote` above has fetched it.
  // Only for a URL-driven open (`urlOpenedIdRef`) — a normal in-page click already sits inside
  // the right folder already (that's what filtered it into the list to click in the first
  // place), so this would otherwise be redundant there, not wrong, just pointless work on every
  // note switch. Re-runs (harmlessly, `sameFolder` bails out) if `templateIds` finishes loading
  // after this — see folderOf's own comment on why an incomplete `knownTemplateIds` can
  // transiently misclassify a real task note as `other`.
  React.useEffect(() => {
    if (!selectedNote || selectedNote.id !== urlOpenedIdRef.current) return;
    const folder = folderOf(selectedNote, templateIds);
    setSelectedFolder(prev => (prev && sameFolder(prev, folder) ? prev : folder));
  }, [selectedNote, templateIds]);

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
      if (folder.kind === 'noteFolder') return noteFolderMap.get(folder.id)?.title ?? 'Folder';
      return templateMap.get(folder.id)?.title ?? 'Task';
    },
    [fieldMap, templateMap, noteFolderMap],
  );
  const selectedFolderTitle = folderTitle(selectedFolder);
  // Deliberately not `folderTitle(folderOf(...))` here — `folderOf`'s `other` bucket is about
  // *sidebar grouping* (a template this device hasn't loaded into `templateMap` yet doesn't get
  // its own Tasks entry), not about whether a link back to it is possible. The note itself
  // always carries its own real `checklistTemplateId`/`checklistId` regardless of whether this
  // page happens to have that template's title cached — falling back to a generic "Task" label
  // (rather than `folderTitle`'s own "Other") still tells the reader this note came from a task,
  // just not which one by name, and the link below still opens the real thing.
  const selectedNoteSourceLabel = selectedNote?.checklistTemplateId
    ? templateMap.get(selectedNote.checklistTemplateId)?.title ?? 'Task'
    : undefined;
  // A journal entry or a field-group's own Home note came *from* a checklist template — this is
  // the link back to it, landed on the exact day the note itself is from (a journal entry's own
  // `checklistId` — that day's real checklist instance — when there is one, else just the date;
  // detail-task-page resolves `currentDay` either way). `undefined` only for a standalone field
  // note (nothing to link to) — an "Other"-bucketed note still has a real `checklistTemplateId`
  // on it (that's the whole reason `getRecommendChecklistTemplates`'s own doc comment on
  // resolving it is a *display* concern, not a routing one) — `/task/:id` fetches that template
  // by id itself once landed there, it doesn't depend on this page having it cached already.
  const selectedNoteSourceHref = React.useMemo(() => {
    if (!selectedNote?.checklistTemplateId) return undefined;
    const params = new URLSearchParams({ currentDay: selectedNote.createdAt });
    if (selectedNote.checklistId) params.set('checklistId', selectedNote.checklistId);
    return `/task/${selectedNote.checklistTemplateId}?${params.toString()}`;
  }, [selectedNote]);

  const selectFolder = (folder: FolderRef | null) => {
    setSelectedFolder(folder);
    setNoteId(null);
    setSelectedFieldId(null);
    setComposing(false);
  };

  const selectNote = (noteId: string) => {
    setNoteId(noteId);
    setSelectedFieldId(null);
    setComposing(false);
  };

  /** A field cluster's own header row (e.g. "Mock Interview") — there's no note of its own to
   * open (see NoteFieldCluster's own comment), so this just switches the editor pane into its
   * record-picker state instead of selecting a note. */
  const selectField = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    setNoteId(null);
    setComposing(false);
  };

  /** The mobile "back from a note" gesture — closes whatever's open in the editor pane without
   * touching which folder is selected, unlike `selectFolder`'s own reset. Desktop never calls
   * this (its editor pane just sits empty, no separate screen to leave). */
  const closeNote = () => {
    setNoteId(null);
    setSelectedFieldId(null);
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
      setNoteId(note.id);
      setSelectedFieldId(null);
    }
    return note;
  };

  /** The "+" button. Exactly one existing empty slot → just create there, no picker needed.
   * Zero or several → `composing` turns on so the editor pane can show a picker: an existing
   * empty field to pick, or a name to type to create a brand-new note-type field on the spot
   * (`createNewNoteType`) — every note-type field ever holds exactly one note (see
   * RecordField.noteId's own comment), so once every field the user already has is full, "+" has
   * nothing existing left to offer; this is what makes it never a dead end regardless of how many
   * notes already exist, rather than just disabling the button once `emptyFields` runs out (what
   * this used to do). */
  const startCompose = () => {
    if (emptyFields.length === 1) {
      createNoteIn(emptyFields[0]);
      return;
    }
    setNoteId(null);
    setSelectedFieldId(null);
    setComposing(true);
  };

  const chooseComposeField = (field: RecordField) => createNoteIn(field);

  /** Composing's own "create a new note type" option, for when every existing note-type field
   * already has its one note — see startCompose's own comment. Creates the field, then
   * immediately creates+opens its note, same as picking an already-empty one would. Blank (or
   * whitespace-only) names are silently ignored, same as createNoteFolder's own guard. */
  const createNewNoteType = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const field = addRecordField({
      title: trimmed,
      icon: 'solar:notebook-line-duotone',
      description: '',
      type: 'note',
      unit: '',
    });
    await createNoteIn(field);
  };

  const cancelCompose = () => setComposing(false);

  const updateSelectedNoteValue = (value: unknown) => {
    if (!selectedNote) return;
    updateNoteApi(selectedNote.id, { value });
  };

  const updateSelectedNoteTitle = (title: string) => {
    if (!selectedNote) return;
    updateNoteApi(selectedNote.id, { title });
  };

  /** `folderId: undefined` clears it — a real key set to `undefined` still drops out of the
   * outgoing JSON body (see noteApi.ts's own `saveNote`), so the server's own `fromNote` sees it
   * as absent and writes `null`, same as it never having been set. Restricted to a standalone
   * note (no `checklistTemplateId`) for now — filing a task-originated note into a personal
   * folder would pull it out of its Task's own grouping in the list (NoteFieldCluster/the
   * group's flat rows), which isn't obviously what someone filing a journal entry away would
   * expect; the source link above still finds its way back to the task either way, since that's
   * driven by `checklistTemplateId`, not by which folder it's filed under. */
  const updateSelectedNoteFolder = (folderId: string | undefined) => {
    if (!selectedNote || selectedNote.checklistTemplateId) return;
    updateNoteApi(selectedNote.id, { folderId });
  };

  /** The sidebar's own "+" next to Folders — creates a real `note_folders` row and switches
   * straight to it, same as `createNoteIn`'s own "land on what you just made" behavior. Blank
   * (or whitespace-only) names are silently ignored rather than creating an unlabeled folder. */
  const createNoteFolder = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const id = addNoteFolder({ title: trimmed });
    selectFolder({ kind: 'noteFolder', id });
  };

  const deleteNote = (note: Note) => {
    deleteNoteApi(note.id);
    if (note.id === selectedNoteId) setNoteId(null);
  };

  return {
    allNoteFields,
    fieldMap,
    templateMap,
    taskFolders,
    noteFolders: allNoteFolders,
    hasOtherNotes,
    emptyFields,
    notes,
    notesLoading: allNotesLoading && allNotes.length === 0,
    totalNoteCount: allNotes.length,
    groupByField: isTaskFolder,
    taskFieldGroupNotes,
    taskFieldClusters,
    selectedFolder,
    selectedFolderTitle,
    selectedNote,
    selectedNoteLoading,
    selectedNoteSourceLabel,
    selectedNoteSourceHref,
    selectedFieldId,
    selectedFieldCluster,
    composing,
    selectFolder,
    selectNote,
    selectField,
    closeNote,
    startCompose,
    chooseComposeField,
    createNewNoteType,
    cancelCompose,
    createNoteFolder,
    updateSelectedNoteValue,
    updateSelectedNoteTitle,
    updateSelectedNoteFolder,
    deleteNote,
  };
};

export { folderOf };
