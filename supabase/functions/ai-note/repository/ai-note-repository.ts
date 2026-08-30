// Plain data access for `ai-note` — no business logic, no authorization decisions, just a query.
// `services/ai-note-service.ts` is the only thing that calls this; `api/` never reaches in here
// directly (see CLAUDE.md's "Authorization: app layer, not RLS"). Runs on the service-role client
// (see `shared/authorize.ts`) but explicitly filters `.eq('user_id', userId)` itself — the
// app-layer check that replaces what used to be RLS scoping this by connection identity.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchNoteValue(db: SupabaseClient, userId: string, noteId: string): Promise<unknown> {
  try {
    const { data } = await db.from('notes').select('value').eq('id', noteId).eq('user_id', userId).maybeSingle();
    return data?.value ?? null;
  } catch (err) {
    console.error('[ai-note] context resolve failed', err);
    return null;
  }
}
