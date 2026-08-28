// Pro-only: same "write a note from a prompt" generation as ai-note (see _shared/
// aiNoteGeneration.ts, which both share end to end), scoped specifically to a note-type field's
// value on an already-submitted checklist record — the one difference: this function also
// resolves that value's real existing content itself, server-side, so a generated block can
// continue what's already there instead of writing with zero awareness of it.
//
//   POST /ai-checklist-record-note { prompt, options, recordId, blockIndex? }
//     → { blocks: GeneratedNoteBlock[] }   Pro
//
// `recordId` identifies *where* — not content. `blockIndex` is the "/ai" placeholder's own index
// among that record's note blocks (see @moon-ui/note-editor's AiWriteTool.tsx). The real
// surrounding text is resolved below from `checklist_records.value_text`, via the caller's own
// RLS-scoped client (never service-role) plus an explicit owner check, matching how this
// codebase's other read queries are already written. This is deliberately NOT a client-sent
// context string: a client that could send arbitrary "context" text would turn this endpoint
// into a free-form text-to-LLM proxy, decoupled from any record it actually owns — sending a
// position instead means only content this caller can already read is ever used. `blockIndex`
// missing, or the record not resolving to anything (wrong id, not this caller's, not real
// Editor.js content), degrades quietly to no context — never a hard error; generation still
// succeeds either way.
//
// Known gap, not fixed here: ChecklistFieldGeneral's own write path currently sends
// checklist_records.value_text the raw Editor.js OutputData object instead of a JSON string, and
// the server-side validator for that column rejects a non-string/number value outright — so a
// note-type record's real content often isn't actually persisted yet. `toBlocks`
// (_shared/aiNoteGeneration.ts) already degrades quietly for exactly that case; worth fixing
// separately, since it affects this function's usefulness more than ai-field-group-note's
// (field_groups is a real jsonb column, unaffected).
//
// SECURITY: params are validated in _shared/aiNoteGeneration.ts; the system prompt is fixed
// there and never reaches the client. A signed-in Pro user is required and rate-limited — see
// _shared/ai.ts.
//
// Deploy: `supabase functions deploy ai-checklist-record-note`

import { extractContext, runNoteGeneration, toBlocks } from '../_shared/aiNoteGeneration.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** RLS on checklist_records is owner-only with no public variant — the explicit
 * `.eq('user_id', userId)` is defense in depth, matching how this codebase's other read queries
 * are already written, not something RLS alone doesn't already guarantee. */
async function resolveRecordNote(db: SupabaseClient, recordId: string, userId: string): Promise<unknown> {
  try {
    const { data } = await db
      .from('checklist_records')
      .select('value_text')
      .eq('id', recordId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.value_text ?? null;
  } catch (err) {
    console.error('[ai-checklist-record-note] context resolve failed', err);
    return null;
  }
}

async function resolveContext(
  params: Record<string, unknown>,
  db: SupabaseClient,
  userId: string,
): Promise<{ before: string; after: string }> {
  const recordId = typeof params.recordId === 'string' ? params.recordId : '';
  const blockIndexRaw = params.blockIndex;
  const blockIndex = typeof blockIndexRaw === 'number' && Number.isFinite(blockIndexRaw) ? blockIndexRaw : null;
  if (!recordId || blockIndex === null) return { before: '', after: '' };

  const blocks = toBlocks(await resolveRecordNote(db, recordId, userId));
  const idx = Math.max(0, Math.min(blockIndex, blocks.length));
  return { before: extractContext(blocks.slice(0, idx), 'end'), after: extractContext(blocks.slice(idx), 'start') };
}

/** Exported for local test harnesses. */
export default function handler(req: Request): Promise<Response> {
  return runNoteGeneration(req, resolveContext, 'ai-checklist-record-note');
}

if (import.meta.main) Deno.serve(handler);
