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
// The actual generation pipeline (prompt template, block-type docs, validation) lives in
// shared/aiNoteGeneration.ts. Everything below `resolveContext` is the one thing that's actually
// specific to this function: every note surface in the app is addressed by a plain `notes.id`
// now (see 20260829010000_notes_note_id_ownership.sql — the owning field/field-group holds its
// own `note_id`, not the other way around), so "resolve this note's real existing content" is
// always the same lookup: `notes` by id, RLS-scoped to the caller.
//
// `noteId` is a *position*, not content — this is deliberately NOT a client-sent context string:
// a client that could send arbitrary "context" text would turn this endpoint into a free-form
// text-to-LLM proxy, decoupled from any note it actually owns — sending an id instead means only
// content this caller can already read is ever used. `resolveNoteValue` below runs on the
// service-role client (see `shared/authorize.ts`) but explicitly filters `.eq('user_id',
// userId)` itself — the app-layer check that replaces what used to be RLS scoping this by
// connection identity. `noteId` missing, `blockIndex` missing, or nothing resolving (wrong id,
// not this caller's, no note written yet) degrades quietly to no context — never a hard error;
// generation still succeeds either way, same as every "/ai" placeholder with no real, persisted
// note yet (a brand-new composer in add-note-page-ui/note-manager-page-ui, or a field/field-group
// that has no note_id yet).
//
// SECURITY: params are validated in shared/aiNoteGeneration.ts; the system prompt is fixed
// there and never reaches the client. A signed-in Pro user is required and rate-limited — see
// shared/ai.ts.
//
// Deploy: `supabase functions deploy ai-note`

import { extractContext, runNoteGeneration, toBlocks } from '../../shared/aiNoteGeneration.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

async function resolveNoteValue(db: SupabaseClient, userId: string, noteId: string): Promise<unknown> {
  try {
    const { data } = await db.from('notes').select('value').eq('id', noteId).eq('user_id', userId).maybeSingle();
    return data?.value ?? null;
  } catch (err) {
    console.error('[ai-note] context resolve failed', err);
    return null;
  }
}

async function resolveContext(
  params: Record<string, unknown>,
  db: SupabaseClient,
  userId: string,
): Promise<{ before: string; after: string }> {
  const noteId = typeof params.noteId === 'string' ? params.noteId : '';
  const blockIndexRaw = params.blockIndex;
  const blockIndex = typeof blockIndexRaw === 'number' && Number.isFinite(blockIndexRaw) ? blockIndexRaw : null;
  if (!noteId || blockIndex === null) return { before: '', after: '' };

  const blocks = toBlocks(await resolveNoteValue(db, userId, noteId));
  const idx = Math.max(0, Math.min(blockIndex, blocks.length));
  return { before: extractContext(blocks.slice(0, idx), 'end'), after: extractContext(blocks.slice(idx), 'start') };
}

/** Exported for local test harnesses. */
export default function handler(req: Request): Promise<Response> {
  return runNoteGeneration(req, resolveContext, 'ai-note');
}

if (import.meta.main) Deno.serve(handler);
