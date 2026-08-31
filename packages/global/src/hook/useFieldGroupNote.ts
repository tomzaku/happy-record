// The one owns-a-field-group's-note pattern (see 20260829010000_notes_note_id_ownership.sql and
// 20260831000000_notes_copied_from_id.sql): resolve which note this caller should see/edit for a
// field group, edit its content in place, and — the one thing that's genuinely different per
// caller — persist a brand-new note's id back onto the group's own owner column, but only when
// this caller *is* the owner.
//
// The owner always edits the group's one canonical note directly (`field_groups.note_id`). A
// challenge participant never edits that note in place (see notes-access-service.ts's own
// `checkWriteNote`) — it's shared/collaborative content the owner controls, not something a
// participant can silently overwrite. A participant who wants to add their own take instead gets
// their own copy: the first time they actually edit it, this forks the canonical note's current
// content into a brand-new note they own (`copiedFromId` pointing back at the original), and every
// edit after that goes to their own copy. There's no toggle back to viewing the canonical note
// once a participant has their own copy yet — that's a deliberate later step (see CLAUDE.md), not
// missing by accident; the data already supports it (`copiedFromId` finds the original any time).
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
  onCreated: (newNoteId: string) => void,
) => {
  const { getNote, getOwnFieldGroupNote, createNote, updateNote } = useNote();
  const { isPro } = useIsPro();

  // My own note for this group — the owner's canonical one (always their own row), or a
  // participant's own fork of it once they've made one.
  const { note: myNote, loading: myLoading, checked } = getOwnFieldGroupNote(fieldGroup.id);
  // Fallback only: a participant with no fork of their own yet reads the canonical note itself,
  // read-only — never fetched at all for the owner (myNote already covers them) or once a
  // participant already has their own copy.
  const wantsCanonical = checked && !myNote && !isOwner;
  const { note: canonicalNote, loading: canonicalLoading } = getNote(wantsCanonical ? fieldGroup.noteId : undefined);

  const note: Note | undefined = myNote ?? canonicalNote;
  const loading = !checked || myLoading || (wantsCanonical && canonicalLoading);

  /** No note of my own yet → create one (the owner's first-ever, or a participant's own fork of
   * the canonical one) and hand its id to the caller to persist onto the group's own owner
   * (`updateFieldGroup`) — only when this caller *is* the owner; a participant's fork is never
   * that group's canonical note, so it's never persisted there. Already has one → update in place.
   * Awaits `createNote` before calling `onCreated` — the owner's own `note_id` is a real FK, so
   * the note has to actually exist server-side before something else is written pointing at it
   * (see createNote's own comment). `save` itself stays fire-and-forget from the caller's side
   * (NoteEditor's `setValue` doesn't await it) — only the two writes *inside* here need to happen
   * in order. */
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

  return { note, loading, save, isPro, generate };
};
