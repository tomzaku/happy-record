import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import { fetchNotes, removeNote as removeNoteApi, saveNote } from './noteApi';

const NOTE_KEY = 'note';
const NOTE_LOADING_KEY = 'note_loading';

/**
 * Addressed by its own `id` — see 20260829010000_notes_note_id_ownership.sql: a field-group's
 * own note (`ownerType: 'field_group'`) is one persistent note, `field_groups.note_id` points at
 * it. A `type: 'note'` field's own value inside a checklist isn't this shape at all anymore —
 * see checklistRecordApi.ts and 20260829040000_notes_via_checklist_records.sql: the client sends
 * it as part of the same `records` array a number field's value goes in, and `checklist-records`
 * routes it to `notes` itself. `ownerType`/`ownerId` (a denormalized reverse pointer, set once at
 * creation, never changed after — see 20260829020000_notes_title_search_owner.sql) is what a
 * search result resolves back to something openable with.
 *
 * `value` (the real, parsed Editor.js `OutputData` every note editor in this app,
 * @moon-ui/note-editor, actually produces — noteApi.ts is the only place that ever
 * stringifies/parses it against the `text` column backing it server-side) is optional now,
 * unlike everything else here: `getAllNotes`/`searchNotes` deliberately never fetch it (see
 * their own comments — a note's content can be large, and a list read only ever shows a title
 * and `preview`), so a `Note` that only came from one of those reads has `value: undefined`
 * until something asks for it specifically (`getNote`/`getNotesByIds`, which do fetch it, and
 * merge it into whatever's already cached rather than replacing the summary outright — see
 * mergeFetched's own comment). `preview` is plain text pulled out of `value`, computed
 * server-side (_shared/notes.ts's `computePreview`) — this client never sends or computes it,
 * only ever reads back whatever the server derived, same as `title`'s own server-derived
 * fallback.
 */
export type Note = {
  id: string;
  value?: unknown;
  title: string;
  preview: string;
  ownerType: 'field' | 'field_group';
  ownerId: string;
  folderId?: string;
  checklistId?: string;
  checklistTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};

/** What a note-owning component has to supply the moment it actually creates a note — see
 * createNote below. A field's own single current note (standalone notebook) omits
 * `checklistId`/`checklistTemplateId`; a field-group's own note sets `checklistTemplateId`. */
export type NoteOrigin =
  | { ownerType: 'field'; ownerId: string; checklistId?: string; checklistTemplateId?: string }
  | { ownerType: 'field_group'; ownerId: string; checklistTemplateId: string };

// Ids already fetched (or created locally, which counts as "fetched" — see createNote) this page
// load, so the same id isn't re-requested every call. Separate from the reactive `loadingIds`
// store below: this is only ever a write-once dedup key, never rendered.
const fetchedIds = new Set<string>();

// Same "have I already fetched this scope" shape every other resource's own "all mine" read
// uses (see useRecordField.tsx's getAllRecordFields, useFieldGroups.tsx's
// ensureAllFieldGroupsFetched) — keyed by identity so a scope already fetched for one user
// re-fetches once the signed-in identity actually changes.
const fetchedAllScopes = new Set<string>();

/**
 * The notebook's own store — not `checklist_records`, and not jsonb on `checklist_templates`
 * either. See the migrations (20260821010000_notes.sql, 20260829010000_notes_note_id_ownership.sql,
 * 20260829020000_notes_title_search_owner.sql) for why every standalone/field-group note ended up
 * here, addressed by a plain `notes.id` that whoever owns it (a field, a field group) points at
 * with its own `note_id`.
 */
export const useNote = () => {
  const [notes, setNotes] = useSessionStore<Record<string, Note>>(NOTE_KEY, {});
  // Reactive (unlike `fetchedIds` above) — this is what lets a consumer render a loading state
  // on its editor while a note it already has the id for is still in flight.
  const [loadingIds, setLoadingIds] = useSessionStore<Record<string, boolean>>(NOTE_LOADING_KEY, {});
  const { ready, userId } = useSession();

  const setLoading = (ids: string[], value: boolean) => {
    setLoadingIds(prev => {
      const next = { ...prev };
      let changed = false;
      for (const id of ids) {
        if (!!next[id] !== value) {
          next[id] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  /** Merges a fetch result into the store — same last-write-wins-by-`updatedAt` shape every
   * other resource here uses, plus one more rule `value`'s own optionality needs: an incoming
   * *summary* (no `value` — a getAllNotes/searchNotes result) must never overwrite a `value`
   * this device already has loaded in full, even when the summary is nominally newer (its other
   * fields — title/preview/updatedAt — still win; only `value` itself is preserved). Without
   * this, a list refresh landing while a note is open in an editor would silently blank out its
   * content. The reverse — a same-or-older-timestamped response that's nonetheless the *first*
   * full content to arrive for a note this device only had a summary of (getNote resolving right
   * after createNote's own optimistic write, say) — still needs to win too, which plain
   * newer-wins alone wouldn't catch. */
  const mergeFetched = (result: { notes: Note[] } | null, requestedIds: string[]) => {
    setLoading(requestedIds, false);
    if (!result) {
      for (const id of requestedIds) fetchedIds.delete(id);
      return;
    }
    if (!result.notes.length) return;
    setNotes(prev => {
      const merged = { ...prev };
      let changed = false;
      for (const incoming of result.notes) {
        const existing = merged[incoming.id];
        if (!existing) {
          merged[incoming.id] = incoming;
          changed = true;
          continue;
        }
        const incomingTime = new Date(incoming.updatedAt).getTime();
        const existingTime = new Date(existing.updatedAt).getTime();
        if (incomingTime > existingTime) {
          merged[incoming.id] =
            incoming.value === undefined && existing.value !== undefined
              ? { ...incoming, value: existing.value }
              : incoming;
          changed = true;
        } else if (incoming.value !== undefined && existing.value === undefined && incomingTime >= existingTime) {
          merged[incoming.id] = incoming;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  };

  /**
   * A single note, by id — the shape every note-owning component (a field group) actually
   * needs: "do I have a `noteId`? If so, is its content here yet, and is it still loading?"
   * `noteId` undefined means the owner has no note yet (nothing to fetch, not loading). "Here
   * yet" means the *full* note, `value` included — a note this device only has a summary of
   * (from getAllNotes/searchNotes) still needs its own `?id=` fetch; checking mere presence in
   * `notes` would wrongly treat that summary as already-loaded and never fetch the real content
   * at all.
   */
  const getNote = React.useCallback(
    (noteId: string | undefined): { note: Note | undefined; loading: boolean } => {
      if (!noteId) return { note: undefined, loading: false };
      if (ready && notes[noteId]?.value === undefined && !fetchedIds.has(noteId)) {
        fetchedIds.add(noteId);
        setLoading([noteId], true);
        fetchNotes({ ids: [noteId] }).then(result => mergeFetched(result, [noteId]));
      }
      return { note: notes[noteId], loading: !!loadingIds[noteId] };
    },
    [notes, loadingIds, ready, setNotes, setLoadingIds],
  );

  /** Several notes at once, by id — the standalone notebook's own listing (useNoteRecord.tsx):
   * one call for every note-type field's `noteId` instead of one request per field. Same "full
   * note, not just a cached summary" check as getNote's own. */
  const getNotesByIds = React.useCallback(
    (ids: (string | undefined)[]): Note[] => {
      const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))].sort();
      const missing = uniqueIds.filter(id => notes[id]?.value === undefined && !fetchedIds.has(id));
      if (ready && missing.length) {
        missing.forEach(id => fetchedIds.add(id));
        fetchNotes({ ids: missing }).then(result => mergeFetched(result, missing));
      }
      return uniqueIds.map(id => notes[id]).filter((n): n is Note => !!n);
    },
    [notes, ready, setNotes],
  );

  /**
   * Every note this user owns, most recently updated first — standalone (one per note-type
   * field), a field-group's own Home note, and every checklist journal entry alike, all in one
   * fetch (see fetchNotes' own comment: none of `id`/`ids`/`q` given means "list everything").
   * note-manager-page-ui's own Notes page is the one consumer that genuinely wants all three at
   * once; nothing scopes this further server-side beyond the fixed page size `notes/index.ts`
   * itself caps at.
   *
   * Summaries only — `value` comes back `undefined` for every note here (see notes/index.ts's
   * own `toNoteSummary`); a note can be a large document, and this is meant to render hundreds
   * of rows at once, not fetch and hold every one's full content just to show a title and
   * `preview`. Opening a specific note (note-manager-page-ui's own detail pane) reaches for
   * `getNote(id)` at that point instead, which does fetch `value` — and merges into whatever
   * this call already cached rather than replacing it (see mergeFetched's own comment).
   */
  const getAllNotes = React.useCallback((): Note[] => {
    const scopeKey = JSON.stringify({ userId });
    if (ready && !fetchedAllScopes.has(scopeKey)) {
      fetchedAllScopes.add(scopeKey);
      fetchNotes().then(result => {
        if (!result) {
          fetchedAllScopes.delete(scopeKey);
          return;
        }
        mergeFetched(result, []);
      });
    }
    return Object.values(notes).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [notes, userId, ready, setNotes]);

  /** Title/search_text substring match, most recently updated first — a search UI's own results
   * list. Not part of the scoped-fetch-by-query-key pattern the read functions above use (a
   * search query changes on every keystroke; there's nothing sensible to dedupe against) — a
   * plain async call, merging what comes back into the store same as everywhere else. */
  const searchNotes = async (query: string, limit?: number): Promise<Note[]> => {
    const result = await fetchNotes({ q: query, limit });
    if (result) mergeFetched(result, []);
    return result?.notes ?? [];
  };

  /** Creates a new note and returns it — the caller persists its `id` onto its own owner right
   * after (`updateFieldGroup`/`updateRecordField`). Marked "already fetched" immediately: this
   * device just wrote it, there's nothing to fetch. `preview` starts empty locally (this
   * optimistic copy) — the server computes the real one from `value` on its own next fetch;
   * nothing here trusts this local placeholder for anything.
   *
   * `async`, and actually awaited by every caller (not fire-and-forget like most writes here —
   * see CLAUDE.md's own note on that) because the owner's own id column (`field_groups.note_id`/
   * `fields.note_id`) is a real FK into `notes`: persisting that id before this row has actually
   * landed server-side is a real race, not a hypothetical one — it shipped once as exactly this,
   * a field-group's `noteId` reaching the server before its note did and failing the FK check. */
  const createNote = async (value: unknown, origin: NoteOrigin, title = '') => {
    const id = v4();
    const now = new Date().toISOString();
    const note: Note = {
      id,
      value,
      title,
      preview: '',
      ownerType: origin.ownerType,
      ownerId: origin.ownerId,
      ...(origin.ownerType === 'field_group'
        ? { checklistTemplateId: origin.checklistTemplateId }
        : {
          ...(origin.checklistId ? { checklistId: origin.checklistId } : {}),
          ...(origin.checklistTemplateId ? { checklistTemplateId: origin.checklistTemplateId } : {}),
        }),
      createdAt: now,
      updatedAt: now,
    };
    fetchedIds.add(id);
    setNotes(prev => ({ ...prev, [id]: note }));
    await saveNote(note);
    return note;
  };

  const updateNote = (
    id: string,
    updates: Partial<Pick<Note, 'value' | 'folderId' | 'title'>>,
  ) => {
    let updated: Note | null = null;
    setNotes(prev => {
      if (!prev[id]) return prev;
      updated = {
        ...prev[id],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...prev, [id]: updated };
    });
    if (updated) saveNote(updated);
    return updated;
  };

  const deleteNote = (id: string) => {
    setNotes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    removeNoteApi(id);
  };

  return {
    notes,
    getNote,
    getNotesByIds,
    getAllNotes,
    searchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
};
