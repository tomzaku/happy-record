// Wires the ai-note edge function (via aiNoteApi.ts) + the shared block-shape mapping
// (lib/editorJsNoteBlocks.ts) into the single `generate` function @moon-ui/note-editor's "/ai"
// tool calls — that package has no dependency on @dreamer/global or the network, by design (see
// its own AiWriteTool.tsx), so the actual API call and Pro check live here instead and get passed
// in as the editor's `ai` prop. See add-note-page-ui's AddNotePage for the call site.
//
// No note-context awareness here on purpose — this is the plain, context-less generator, used
// by every "/ai" placeholder with no real, persisted note/record/field-group to resolve context
// from yet (a brand-new, not-yet-saved note or record). The two cases that do have something to
// draw context from use their own separate hooks instead — useAiFieldGroupNoteGenerate.ts and
// useAiChecklistRecordNoteGenerate.ts — each backed by its own edge function that resolves
// context server-side from a position the client sends, not client-sent text (see either of
// those edge functions' own comments for why).

import { useIsPro } from '../store/pro/useProStatus';
import { generateNote, type AiNoteOption } from '../store/note/aiNoteApi';
import { buildEditorJsBlocks, type EditorJsBlockInput } from '../lib/editorJsNoteBlocks';

export const useAiNoteGenerate = () => {
  const { isPro } = useIsPro();

  /** Throws `ApiError` on failure (rate limit, not Pro, provider error, offline) — there's no
   * local fallback for "the AI didn't run," so the composer's own try/catch is what surfaces
   * this, same as AiChecklistGenerate's handleGenerate. */
  const generate = async (prompt: string, options: AiNoteOption[]): Promise<EditorJsBlockInput[]> => {
    const { blocks } = await generateNote({ prompt, options });
    return buildEditorJsBlocks(blocks);
  };

  return { isPro, generate };
};
