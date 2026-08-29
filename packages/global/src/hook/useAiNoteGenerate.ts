// Wires the ai-note edge function (via aiNoteApi.ts) + the shared block-shape mapping
// (lib/editorJsNoteBlocks.ts) into the single `generate` function @moon-ui/note-editor's "/ai"
// tool calls — that package has no dependency on @dreamer/global or the network, by design (see
// its own AiWriteTool.tsx), so the actual API call and Pro check live here instead and get passed
// in as the editor's `ai` prop. See add-note-page-ui's AddNotePage for the call site.
//
// No note-context awareness here on purpose — this is the plain, context-less generator, used
// by every "/ai" placeholder with no real, persisted note to resolve context from yet (a
// brand-new, not-yet-saved note — add-note-page-ui/note-manager-page-ui's composers). A note
// that already has an id (a field's own note, a field group's own note) resolves context through
// useNoteById.ts's own `generate` instead — same ai-note edge function underneath, just with the
// `noteId` param that makes it resolve context server-side from a position the client sends, not
// client-sent text (see ai-note/index.ts's own comment for why).

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
