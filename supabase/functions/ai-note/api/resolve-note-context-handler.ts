// The one thing actually specific to `ai-note` — everything else (routing, auth, rate limit,
// Pro gate, provider call) lives in `shared/aiNoteGeneration.ts`'s `runNoteGeneration`, shared
// with every other `ai-*` function, so there's no local ROUTES table here the way CRUD resources
// have: `runNoteGeneration` already owns "is this a POST" and dispatches straight into this
// resolver.
//
// Every note surface in the app is addressed by a plain `notes.id` now (see
// 20260829010000_notes_note_id_ownership.sql — the owning field/field-group holds its own
// `note_id`, not the other way around), so "resolve this note's real existing content" is always
// the same lookup: `notes` by id, scoped to the caller.
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

import { extractContext, toBlocks } from '../../../shared/aiNoteGeneration.ts';
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

export async function resolveNoteContext(
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
