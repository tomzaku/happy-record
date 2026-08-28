// Client for the `ai-note` edge function — see CLAUDE.md ("Data access: go through an edge
// function") and supabase/functions/ai-note/index.ts for the prompt/validation this wraps.
// Pro-only, same as ai-checklist-template; the server is the real gate.
//
// Not `quiet: true`, for the same reason as aiChecklistTemplateApi — there's no local fallback
// for "the AI didn't run." The caller (useAiNoteGenerate) needs the error to reach the "/ai"
// composer in @moon-ui/note-editor, not silently do nothing.

import { request } from '../../lib/api';
import type { AiGeneratedNoteBlock } from '../../lib/editorJsNoteBlocks';

/** The block types the "/ai" composer (@moon-ui/note-editor) lets the user toggle on/off, on top
 * of the always-available heading/paragraph. Mirrors ai-note's own OPTION set — kept as a plain
 * string union rather than importing from the editor package (packages/global has no dependency
 * on @moon-ui/note-editor, and shouldn't gain one just for a string literal type). */
export type AiNoteOption = 'video' | 'quote' | 'checklist' | 'list';

export type AiGenerateNoteParams = {
  prompt: string;
  options: AiNoteOption[];
};

export type AiGeneratedNote = {
  blocks: AiGeneratedNoteBlock[];
};

export function generateNote(
  params: AiGenerateNoteParams,
  opts: { signal?: AbortSignal } = {},
): Promise<AiGeneratedNote> {
  // Generation is slow — give it real headroom over the default 8s, same as
  // aiChecklistTemplateApi's generateChecklistTemplate.
  return request.post('/ai-note', params, { signal: opts.signal, timeout: 60_000 });
}
