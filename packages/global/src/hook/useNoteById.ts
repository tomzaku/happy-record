// The one owns-a-noteId pattern, used everywhere a field or a field group has its own single
// persistent note (see 20260829010000_notes_note_id_ownership.sql): fetch it by id with a
// loading state, edit it (and its title) in place, and — the one thing that's genuinely
// different per owner — persist a brand-new note's id back onto whichever row owns it the first
// time someone actually writes something. Replaces what used to be two near-identical hooks
// (useAiFieldGroupNoteGenerate.ts, useAiFieldNoteGenerate.ts) now that a field-group's note and a
// note-type field's note are the exact same shape of thing: an optional `noteId`, resolved
// through useNote.tsx's getNote, with "/ai" resolving its own context from that same id (see
// ai-note/index.ts).
//
// Call sites: ChecklistFieldGroupView.tsx, for both the group's own note and each note-type
// field's note it renders alongside it.

import { useNote, type NoteOrigin } from '../store/note/useNote';
import { useIsPro } from '../store/pro/useProStatus';
import { generateNote, type AiNoteOption } from '../store/note/aiNoteApi';
import { buildEditorJsBlocks, type EditorJsBlockInput } from '../lib/editorJsNoteBlocks';

export const useNoteById = (
  noteId: string | undefined,
  origin: NoteOrigin,
  onCreated: (newNoteId: string) => void,
) => {
  const { getNote, createNote, updateNote } = useNote();
  const { isPro } = useIsPro();
  const { note, loading } = getNote(noteId);

  /** No note yet → create one (with whatever title's already been typed, if any — see
   * saveTitle's own note) and hand its id to the caller to persist onto its own owner
   * (updateRecordField/updateFieldGroup); already has one → update in place. */
  const save = (value: unknown) => {
    if (noteId) {
      updateNote(noteId, { value });
    } else {
      const created = createNote(value, origin);
      onCreated(created.id);
    }
  };

  /** A no-op before the note exists — there's nothing to title yet, and creating one from a
   * title alone (no content) isn't a real note in this app. In practice the content editor is
   * always on screen right next to the title input, so this only actually matters for the
   * instant between "the note doesn't exist" and "the first real edit created it". */
  const saveTitle = (title: string) => {
    if (noteId) updateNote(noteId, { title });
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
    const { blocks } = await generateNote({ prompt, options, noteId, blockIndex: context.blockIndex });
    return buildEditorJsBlocks(blocks);
  };

  return { note, loading, save, saveTitle, isPro, generate };
};
