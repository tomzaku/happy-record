// Pro-only: turns a free-text prompt ("plan a 3-day trip to Kyoto") into a ready-to-insert note —
// a short sequence of typed content blocks the client renders straight into Editor.js
// (@moon-ui/note-editor). Called from that package's own "/ai" block tool (AiWriteTool.tsx) via
// packages/global/src/hook/useAiNoteGenerate.ts / useAiFieldGroupNoteGenerate.ts /
// useAiChecklistRecordNoteGenerate.ts, all backed by store/note/aiNoteApi.ts — see CLAUDE.md's
// "Data access: go through an edge function".
//
//   POST /ai-note { prompt, options, noteId?, blockIndex? } → { blocks: GeneratedNoteBlock[] }   Pro
//
// `options` is which extra block types (beyond the always-available heading/paragraph) the user
// toggled on in the composer — a subset of "video"/"quote"/"checklist"/"list".
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy ai-note`),
// so it stays a thin entrypoint. The actual generation pipeline (prompt template, block-type
// docs, validation, auth/rate-limit/Pro-gate/provider call) lives in `shared/aiNoteGeneration.ts`,
// shared with every other `ai-*` function — `api/resolve-note-context-handler.ts` is the one
// piece that's actually specific to this function (see its own doc comment).
//
// SECURITY: params are validated in shared/aiNoteGeneration.ts; the system prompt is fixed
// there and never reaches the client. A signed-in Pro user is required and rate-limited — see
// shared/ai.ts.
//
// Deploy: `supabase functions deploy ai-note`

import { runNoteGeneration } from '../../shared/aiNoteGeneration.ts';
import { resolveNoteContext } from './api/resolve-note-context-handler.ts';

/** Exported for local test harnesses. */
export default function handler(req: Request): Promise<Response> {
  return runNoteGeneration(req, resolveNoteContext, 'ai-note');
}

if (import.meta.main) Deno.serve(handler);
