// Client for the `ai-checklist-record-note` edge function — see CLAUDE.md ("Data access: go
// through an edge function") and supabase/functions/ai-checklist-record-note/index.ts for the
// prompt/validation/context-resolution this wraps. Pro-only, same as ai-note; the server is the
// real gate.
//
// `recordId` is a *position*, not content — the server resolves that record's own real
// `value_text` itself, RLS-scoped, rather than trusting whatever text a client might send (see
// the edge function's own comment for why that distinction matters).
//
// Not `quiet: true`, for the same reason as aiNoteApi — there's no local fallback for "the AI
// didn't run." The caller (useAiChecklistRecordNoteGenerate) needs the error to reach the "/ai"
// composer in @moon-ui/note-editor, not silently do nothing.

import { request } from '../../lib/api';
import type { AiGeneratedNoteBlock } from '../../lib/editorJsNoteBlocks';
import type { AiNoteOption } from './aiNoteApi';

export type AiGenerateChecklistRecordNoteParams = {
  prompt: string;
  options: AiNoteOption[];
  recordId: string;
  /** This placeholder's own index among the record's note blocks — see AiWriteTool.tsx.
   * Meaningless without `recordId` (and vice versa); omitted → no context resolved. */
  blockIndex?: number;
};

export type AiGeneratedNote = {
  blocks: AiGeneratedNoteBlock[];
};

export function generateChecklistRecordNote(
  params: AiGenerateChecklistRecordNoteParams,
  opts: { signal?: AbortSignal } = {},
): Promise<AiGeneratedNote> {
  // Generation is slow — give it real headroom over the default 8s, same as ai-note's own client.
  return request.post('/ai-checklist-record-note', params, { signal: opts.signal, timeout: 60_000 });
}
