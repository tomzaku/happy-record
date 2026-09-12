// The one owns-a-checklist-template's-description pattern — see useFieldGroupNote.ts, which this
// mirrors, minus the public/personal fork: a checklist template's description has exactly one
// row, the owner's own. Everyone else who can see the template at all (see
// notes-access-service.ts's own isReadable) reads that same row read-only; there's no "make your
// own copy" the way a challenge participant gets for a field group's Home note, since a
// description describes the task itself, not something a participant records their own take on.
//
// Call site: ChecklistGenericInfo (detail-task-page), for the template's own Description row.

import React from 'react';
import { useNote, type NoteOrigin } from '../store/note/useNote';
import { useCurrentAccount } from './useCurrentAccount';
import { generateNote, type AiNoteOption } from '../store/note/aiNoteApi';
import { buildEditorJsBlocks, type EditorJsBlockInput } from '../lib/editorJsNoteBlocks';

type ChecklistTemplateNoteOrigin = { id: string; noteId?: string };

export const useChecklistTemplateNote = (
  checklistTemplate: ChecklistTemplateNoteOrigin,
  isOwner: boolean,
  onCreated: (newNoteId: string) => void,
) => {
  const { getNote, updateNote, createNote } = useNote();
  const { isPro } = useCurrentAccount();

  // The owner's own row when it exists; a non-owner reads this same row too (read-only — see
  // checkWriteNote's own owner-only rule) once the template itself resolved it onto `noteId`.
  const { note, loading } = getNote(checklistTemplate.noteId);

  // Same reasoning as useFieldGroupNote.ts's own `noteRef`: `save` is handed to `NoteEditor` as
  // its `setValue` prop, captured exactly once at mount — a ref keeps it pointed at whichever note
  // is actually current instead of whatever `note` looked like at that first render.
  const noteRef = React.useRef(note);
  noteRef.current = note;

  const save = (value: unknown) => {
    const current = noteRef.current;
    if (!current) return;
    updateNote(current.id, { value });
  };

  /** Makes the owner's very first (empty) note before the editor switches into edit mode — same
   * "not lazily on the first keystroke" reasoning as useFieldGroupNote.ts's own `startEditing`.
   * A no-op for a non-owner (nothing for them to create) or once a note already exists. */
  const startEditing = async () => {
    if (note || !isOwner) return;
    const origin: NoteOrigin = {
      ownerType: 'checklist_template',
      ownerId: checklistTemplate.id,
      checklistTemplateId: checklistTemplate.id,
    };
    const created = await createNote(undefined, origin);
    onCreated(created.id);
  };

  /** Throws `ApiError` on failure — see useFieldGroupNote.ts's own `generate` for why there's no
   * local fallback. */
  const generate = async (
    prompt: string,
    options: AiNoteOption[],
    context: { blockIndex: number },
  ): Promise<EditorJsBlockInput[]> => {
    const { blocks } = await generateNote({ prompt, options, noteId: note?.id, blockIndex: context.blockIndex });
    return buildEditorJsBlocks(blocks);
  };

  return { note, loading, startEditing, save, isPro, generate };
};
