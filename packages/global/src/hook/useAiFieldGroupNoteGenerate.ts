// Position-aware sibling of useAiNoteGenerate.ts — same wiring shape (Pro check + `generate`
// threaded into NoteEditor's `ai` prop, see that file's own comment), but for a checklist
// template's own field-group note specifically: `checklistTemplateId`/`fieldGroupId` are
// captured here and forwarded to ai-field-group-note, which resolves that note's real existing
// content itself, server-side (see that edge function's own comment for why this is a position,
// not client-sent text). Call site: ChecklistFieldGroupView.tsx.

import { useIsPro } from '../store/pro/useProStatus';
import { generateFieldGroupNote } from '../store/note/aiFieldGroupNoteApi';
import type { AiNoteOption } from '../store/note/aiNoteApi';
import { buildEditorJsBlocks, type EditorJsBlockInput } from '../lib/editorJsNoteBlocks';

export const useAiFieldGroupNoteGenerate = (checklistTemplateId: string, fieldGroupId: string) => {
  const { isPro } = useIsPro();

  /** Throws `ApiError` on failure (rate limit, not Pro, provider error, offline) — there's no
   * local fallback for "the AI didn't run," so the composer's own try/catch is what surfaces
   * this, same as useAiNoteGenerate's own generate. `context.blockIndex` is the "/ai"
   * placeholder's own position, read fresh at generate-time by AiWriteTool.tsx — not content. */
  const generate = async (
    prompt: string,
    options: AiNoteOption[],
    context: { blockIndex: number },
  ): Promise<EditorJsBlockInput[]> => {
    const { blocks } = await generateFieldGroupNote({
      prompt,
      options,
      checklistTemplateId,
      fieldGroupId,
      blockIndex: context.blockIndex,
    });
    return buildEditorJsBlocks(blocks);
  };

  return { isPro, generate };
};
