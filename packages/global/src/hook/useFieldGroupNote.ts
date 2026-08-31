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
// overwrite. A participant who wants to add their own take instead gets their own copy: the first
// time they actually edit it, this forks the canonical note's current content into a brand-new
// note they own (`copiedFromId` pointing back at the original), and every edit after that goes to
// their own copy. `view` is how the caller (ChecklistFieldGroupView) lets a participant switch
// between reading the canonical note (`'public'`, always read-only for them) and their own copy
// (`'personal'`, falls back to the canonical content read-only until they've actually made one).
//
// Call site: ChecklistFieldGroupView.tsx, for the group's own note. A `type: 'note'` field's own
// value isn't this shape anymore — it's a checklist journal entry (see ChecklistFieldGeneral's
// own comment and 20260829030000_notes_checklist_history.sql), a new row per submission rather
// than one note fetched/edited by id.

import { useNote, type Note, type NoteOrigin } from '../store/note/useNote';
import { useIsPro } from '../store/pro/useProStatus';
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
  const { isPro } = useIsPro();

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
  // their own copy if they have one, else the canonical content as a starting point (editing from
  // here is exactly what forks it — see `save` below). Non-owner viewing `'public'`: always the
  // canonical note, whether or not they also have their own copy.
  const note: Note | undefined = isOwner ? myNote : view === 'personal' ? myNote ?? canonicalNote : canonicalNote;
  const loading = !checked || myLoading || (wantsCanonical && canonicalLoading);
  // The canonical note is never directly editable by a non-owner, regardless of `isEditing` — see
  // `save`'s own comment on why looking at it while `view: 'personal'` still edits (forks) rather
  // than writing it in place.
  const readOnlyLocked = !isOwner && view === 'public';

  /** No note of my own yet → create one (the owner's first-ever, or a participant's own fork of
   * the canonical one) and hand its id to the caller to persist onto the group's own owner
   * (`updateFieldGroup`) — only when this caller *is* the owner; a participant's fork is never
   * that group's canonical note, so it's never persisted there. Already has one → update in place.
   * Awaits `createNote` before calling `onCreated` — the owner's own `note_id` is a real FK, so
   * the note has to actually exist server-side before something else is written pointing at it
   * (see createNote's own comment). `save` itself stays fire-and-forget from the caller's side
   * (NoteEditor's `setValue` doesn't await it) — only the two writes *inside* here need to happen
   * in order. Never called while `view: 'public'` — the caller keeps that view locked read-only
   * (see `readOnlyLocked`), so `myNote` here is always what `view: 'personal'` would show. */
  const save = async (value: unknown) => {
    if (myNote) {
      updateNote(myNote.id, { value });
      return;
    }
    const origin: NoteOrigin = {
      ownerType: 'field_group',
      ownerId: fieldGroup.id,
      checklistTemplateId: fieldGroup.checklistTemplateId,
      ...(isOwner ? {} : { copiedFromId: canonicalNote?.id }),
    };
    const created = await createNote(value, origin);
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

  return { note, loading, hasPersonalCopy, readOnlyLocked, save, isPro, generate };
};
