// Business logic for `ai-note` — turning a resolved note's `value` into the before/after text
// context a generation prompt needs. `noteId` is a *position*, not content — this is deliberately
// NOT a client-sent context string: a client that could send arbitrary "context" text would turn
// this endpoint into a free-form text-to-LLM proxy, decoupled from any note it actually owns —
// sending an id instead means only content this caller can already read is ever used. `noteId`
// missing, `blockIndex` missing, or nothing resolving (wrong id, not this caller's, no note
// written yet) degrades quietly to no context — never a hard error; generation still succeeds
// either way, same as every "/ai" placeholder with no real, persisted note yet.

import { extractContext, toBlocks } from '../../../shared/aiNoteGeneration.ts';
import { fetchNoteValue } from '../repository/ai-note-repository.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function resolveNoteContext(
  params: Record<string, unknown>,
  db: SupabaseClient,
  userId: string,
): Promise<{ before: string; after: string }> {
  const noteId = typeof params.noteId === 'string' ? params.noteId : '';
  const blockIndexRaw = params.blockIndex;
  const blockIndex = typeof blockIndexRaw === 'number' && Number.isFinite(blockIndexRaw) ? blockIndexRaw : null;
  if (!noteId || blockIndex === null) return { before: '', after: '' };

  const blocks = toBlocks(await fetchNoteValue(db, userId, noteId));
  const idx = Math.max(0, Math.min(blockIndex, blocks.length));
  return { before: extractContext(blocks.slice(0, idx), 'end'), after: extractContext(blocks.slice(idx), 'start') };
}
