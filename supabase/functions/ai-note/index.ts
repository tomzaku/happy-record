// Pro-only: turns a free-text prompt ("plan a 3-day trip to Kyoto") into a ready-to-insert note —
// a short sequence of typed content blocks the client renders straight into Editor.js
// (@moon-ui/note-editor). Called from that package's own "/ai" block tool (AiWriteTool.tsx) via
// packages/global/src/hook/useAiNoteGenerate.ts / store/note/aiNoteApi.ts — see CLAUDE.md's
// "Data access: go through an edge function".
//
//   POST /ai-note { prompt, options } → { blocks: GeneratedNoteBlock[] }   Pro
//
// `options` is which extra block types (beyond the always-available heading/paragraph) the user
// toggled on in the composer — a subset of "video"/"quote"/"checklist"/"list". Mirrors
// ai-checklist-template's own GeneratedNoteBlock shape (that function's groups reuse the same 4
// base variants for their own note) extended with `checklist`/`list`, which only this function
// emits.
//
// The actual generation pipeline (prompt template, block-type docs, validation) lives in
// _shared/aiNoteGeneration.ts, shared with ai-field-group-note/ai-checklist-record-note — those
// two generate the exact same kind of content, differing only in that they also resolve real
// context from a database row first. This function has no note to resolve context from at all
// (it serves every "/ai" placeholder with no real, persisted note/record/field-group yet —
// add-note-page-ui's and note-manager-page-ui's new-note composers, ChecklistFieldGroupAdd), so
// its own `resolveContext` below always returns empty.
//
// SECURITY: params are validated in _shared/aiNoteGeneration.ts; the system prompt is fixed
// there and never reaches the client. A signed-in Pro user is required and rate-limited — see
// _shared/ai.ts.
//
// Deploy: `supabase functions deploy ai-note`

import { runNoteGeneration } from '../_shared/aiNoteGeneration.ts';

async function resolveContext(): Promise<{ before: string; after: string }> {
  return { before: '', after: '' };
}

/** Exported for local test harnesses. */
export default function handler(req: Request): Promise<Response> {
  return runNoteGeneration(req, resolveContext, 'ai-note');
}

if (import.meta.main) Deno.serve(handler);
