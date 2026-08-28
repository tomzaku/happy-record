// Client for the `ai-field-group-note` edge function — see CLAUDE.md ("Data access: go through
// an edge function") and supabase/functions/ai-field-group-note/index.ts for the prompt/
// validation/context-resolution this wraps. Pro-only, same as ai-note; the server is the real
// gate.
//
// `checklistTemplateId`/`fieldGroupId` are a *position*, not content — the server resolves the
// field group's own real note itself, RLS-scoped, rather than trusting whatever text a client
// might send (see the edge function's own comment for why that distinction matters).
//
// Not `quiet: true`, for the same reason as aiNoteApi — there's no local fallback for "the AI
// didn't run." The caller (useAiFieldGroupNoteGenerate) needs the error to reach the "/ai"
// composer in @moon-ui/note-editor, not silently do nothing.

import { request } from '../../lib/api';
import type { AiGeneratedNoteBlock } from '../../lib/editorJsNoteBlocks';
import type { AiNoteOption } from './aiNoteApi';

export type AiGenerateFieldGroupNoteParams = {
  prompt: string;
  options: AiNoteOption[];
  checklistTemplateId: string;
  fieldGroupId: string;
  /** This placeholder's own index among the field group's note blocks — see AiWriteTool.tsx.
   * Meaningless without the ids above (and vice versa); omitted → no context resolved. */
  blockIndex?: number;
};

export type AiGeneratedNote = {
  blocks: AiGeneratedNoteBlock[];
};

export function generateFieldGroupNote(
  params: AiGenerateFieldGroupNoteParams,
  opts: { signal?: AbortSignal } = {},
): Promise<AiGeneratedNote> {
  // Generation is slow — give it real headroom over the default 8s, same as ai-note's own client.
  return request.post('/ai-field-group-note', params, { signal: opts.signal, timeout: 60_000 });
}
