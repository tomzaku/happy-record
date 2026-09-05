// The one owns-a-field-group's-note pattern (see 20260829010000_notes_note_id_ownership.sql and
// 20260831000000_notes_copied_from_id.sql): resolve which note this caller should see/edit for a
// field group, edit its content in place, and — the one thing that's genuinely different per
// caller — persist a brand-new note's id back onto the group's own owner column, but only when
// this caller *is* the owner.
//
// The owner always edits the group's one canonical note directly (`field_groups.note_id`) — there
// is no "public vs. personal" distinction for them, `view` is ignored. A challenge participant
// never edits that note in place (see notes-access-service.ts's own `checkWriteNote`) — it's
// shared/collaborative content the owner controls, not something a participant can silently
// overwrite. A participant who wants to add their own take instead gets their own copy, made the
// moment they start editing (`startEditing`, not lazily on the first keystroke — see its own
// comment for why that matters), and every edit after that goes to their own copy. `view` is how
// the caller (ChecklistFieldGroupView) lets a participant switch between reading the canonical
// note (`'public'`, always read-only for them, even once they have their own copy too) and their
// own copy (`'personal'`).
//
// Call site: ChecklistFieldGroupView.tsx, for the group's own note. A `type: 'note'` field's own
// value isn't this shape anymore — it's a checklist journal entry (see ChecklistFieldGeneral's
// own comment and 20260829030000_notes_checklist_history.sql), a new row per submission rather
// than one note fetched/edited by id.

import React from 'react';
import { useNote, type Note, type NoteOrigin } from '../store/note/useNote';
import { useCurrentAccount } from './useCurrentAccount';
import { generateNote, type AiNoteOption } from '../store/note/aiNoteApi';
import { buildEditorJsBlocks, type EditorJsBlockInput } from '../lib/editorJsNoteBlocks';

type FieldGroupNoteOrigin = { id: string; noteId?: string; checklistTemplateId: string };

export const useFieldGroupNote = (
  fieldGroup: FieldGroupNoteOrigin,
  isOwner: boolean,
  view: 'public' | 'personal',
  onCreated: (newNoteId: string) => void,
) => {
  const { getNote, getOwnFieldGroupNote, createNote, updateNote } = useNote();
  const { isPro } = useCurrentAccount();

  // My own note for this group — the owner's canonical one (always their own row), or a
  // participant's own fork of it once they've made one.
  const { note: myNote, loading: myLoading, checked } = getOwnFieldGroupNote(fieldGroup.id);
  // Fetched for any non-owner, not just as a fallback for one with no fork yet — a participant who
  // *does* have their own copy can still switch back to `view: 'public'` to read the original.
  // Never fetched for the owner (myNote already *is* the canonical note for them).
  const wantsCanonical = checked && !isOwner;
  const { note: canonicalNote, loading: canonicalLoading } = getNote(wantsCanonical ? fieldGroup.noteId : undefined);

  const hasPersonalCopy = !isOwner && !!myNote;
  // Owner: always their own (only) note, `view` is meaningless. Non-owner viewing `'personal'`:
  // their own copy — always defined by the time this is reachable, since `startEditing` makes one
  // before the caller ever switches here (see ChecklistFieldGroupView's own handleEditClick).
  // Non-owner viewing `'public'`: always the canonical note, whether or not they also have their
  // own copy.
  const note: Note | undefined = isOwner ? myNote : view === 'personal' ? myNote : canonicalNote;
  const loading = !checked || myLoading || (wantsCanonical && canonicalLoading);

  // `save` (below) is handed to `NoteEditor` as its `setValue` prop, which EditorJs.tsx captures
  // exactly once, at mount, and never picks up a newer function reference — so `save` can't safely
  // decide "update or create" from data closed over at whatever render it happened to be created
  // on. A ref instead: always the *current* note to write into, however long ago this particular
  // `save` closure was actually captured. `startEditing` below is what guarantees `note` is
  // already set by the time this is ever called with `readOnly: false`.
  const noteRef = React.useRef(note);
  noteRef.current = note;

  const save = (value: unknown) => {
    const current = noteRef.current;
    if (!current) return;
    updateNote(current.id, { value });
  };

  /** Ensures this caller has their own note to write into *before* the editor switches into edit
   * mode: the owner's very first (empty) one, or a participant's own fork of the canonical note's
   * current content — made the moment editing starts, not lazily on the first keystroke. That
   * laziness is exactly what broke this the first time: `save`'s own decision ("do I already have
   * a note, or do I need to create one?") would otherwise run from inside `NoteEditor`'s frozen
   * `setValue` closure (see `save`'s own comment) on whatever `myNote` looked like the moment that
   * closure was captured — permanently `undefined` for a participant whose very first character
   * created a note, since that closure never got a chance to see the new one. Every further edit
   * kept re-deciding "I have none yet" and creating *another* new note, each with the same
   * `(owner_type, owner_id, user_id)` as the last — silently multiplying duplicate copies until
   * `GET /notes?fieldGroupId=`'s own `.maybeSingle()` found more than one and errored. Pre-creating
   * here removes that decision from `save`'s own path entirely: by the time editing is possible,
   * there's always exactly one note already there to update. A no-op once one already exists. */
  const startEditing = async () => {
    if (myNote) return;
    const origin: NoteOrigin = {
      ownerType: 'field_group',
      ownerId: fieldGroup.id,
      checklistTemplateId: fieldGroup.checklistTemplateId,
      ...(isOwner ? {} : { copiedFromId: canonicalNote?.id }),
    };
    const created = await createNote(isOwner ? undefined : canonicalNote?.value, origin);
    if (isOwner) onCreated(created.id);
  };

  /** Throws `ApiError` on failure (rate limit, not Pro, provider error, offline) — there's no
   * local fallback for "the AI didn't run," so the composer's own try/catch is what surfaces
   * this, same as useAiNoteGenerate's own generate. `context.blockIndex` is the "/ai"
   * placeholder's own position, read fresh at generate-time by AiWriteTool.tsx — not content;
   * meaningless (and skipped server-side) until this note actually has an id. */
  const generate = async (
    prompt: string,
    options: AiNoteOption[],
    context: { blockIndex: number },
  ): Promise<EditorJsBlockInput[]> => {
    const { blocks } = await generateNote({ prompt, options, noteId: note?.id, blockIndex: context.blockIndex });
    return buildEditorJsBlocks(blocks);
  };

  return { note, loading, hasPersonalCopy, startEditing, save, isPro, generate };
};
