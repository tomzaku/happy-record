// Client for the `ai-note` edge function — see CLAUDE.md ("Data access: go through an edge
// function") and supabase/functions/ai-note/index.ts for the prompt/validation/context-resolution
// this wraps. Pro-only, same as ai-checklist-template; the server is the real gate.
//
// `noteId` is a *position*, not content — the server resolves that note's own real value itself,
// RLS-scoped, rather than trusting whatever text a client might send (see the edge function's own
// comment for why that distinction matters). Every "/ai" call site sends it when there's an
// existing note to resolve context from (see useNoteById.ts), or omits it for a brand-new note
// with nothing to resolve yet (useAiNoteGenerate.ts).
//
// Not `quiet: true`, for the same reason as aiChecklistTemplateApi — there's no local fallback
// for "the AI didn't run." The caller needs the error to reach the "/ai" composer in
// @moon-ui/note-editor, not silently do nothing.

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
  /** The note this "/ai" placeholder's own content belongs to, if it already exists. */
  noteId?: string;
  /** This placeholder's own index among the note's blocks — see AiWriteTool.tsx. Meaningless
   * without `noteId` (and vice versa); omitted → no context resolved. */
  blockIndex?: number;
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
