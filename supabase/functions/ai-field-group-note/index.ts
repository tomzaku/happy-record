// Pro-only: same "write a note from a prompt" generation as ai-note (see _shared/
// aiNoteGeneration.ts, which both share end to end), scoped specifically to a checklist
// template's own field-group note — the one difference: this function also resolves that note's
// real existing content itself, server-side, so a generated block can continue what's already
// there instead of writing with zero awareness of it.
//
//   POST /ai-field-group-note { prompt, options, checklistTemplateId, fieldGroupId, blockIndex? }
//     → { blocks: GeneratedNoteBlock[] }   Pro
//
// `checklistTemplateId`/`fieldGroupId` identify *where* — not content. `blockIndex` is the "/ai"
// placeholder's own index among that field group's note blocks (see @moon-ui/note-editor's
// AiWriteTool.tsx). The real surrounding text is resolved below from
// `checklist_templates.field_groups`, via the caller's own RLS-scoped client (never
// service-role) — the same "owner OR public template" rule `checklist-templates/index.ts`'s own
// `?id=` GET route already enforces, reused here rather than re-derived. This is deliberately
// NOT a client-sent context string: a client that could send arbitrary "context" text would turn
// this endpoint into a free-form text-to-LLM proxy, decoupled from any note it actually owns —
// sending a position instead means only content this caller can already read is ever used.
// `blockIndex` missing, or the template/group not resolving to anything (wrong id, not this
// caller's / not public, malformed content), degrades quietly to no context — never a hard
// error; generation still succeeds either way.
//
// SECURITY: params are validated in _shared/aiNoteGeneration.ts; the system prompt is fixed
// there and never reaches the client. A signed-in Pro user is required and rate-limited — see
// _shared/ai.ts.
//
// Deploy: `supabase functions deploy ai-field-group-note`

import { extractContext, runNoteGeneration, toBlocks } from '../_shared/aiNoteGeneration.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** No `user_id` filter — intentionally matches checklist-templates/index.ts's own `?id=` GET
 * route: relies entirely on RLS ("owner OR visibility = 'public'") to decide what comes back, so
 * someone else's private template by id just resolves to no context, not an error. */
async function resolveFieldGroupNote(
  db: SupabaseClient,
  checklistTemplateId: string,
  fieldGroupId: string,
): Promise<unknown> {
  try {
    const { data } = await db
      .from('checklist_templates')
      .select('field_groups')
      .eq('id', checklistTemplateId)
      .maybeSingle();
    const groups = Array.isArray(data?.field_groups) ? data.field_groups as Record<string, unknown>[] : [];
    return groups.find(g => g.id === fieldGroupId)?.note ?? null;
  } catch (err) {
    console.error('[ai-field-group-note] context resolve failed', err);
    return null;
  }
}

async function resolveContext(
  params: Record<string, unknown>,
  db: SupabaseClient,
): Promise<{ before: string; after: string }> {
  const checklistTemplateId = typeof params.checklistTemplateId === 'string' ? params.checklistTemplateId : '';
  const fieldGroupId = typeof params.fieldGroupId === 'string' ? params.fieldGroupId : '';
  const blockIndexRaw = params.blockIndex;
  const blockIndex = typeof blockIndexRaw === 'number' && Number.isFinite(blockIndexRaw) ? blockIndexRaw : null;
  if (!checklistTemplateId || !fieldGroupId || blockIndex === null) return { before: '', after: '' };

  const blocks = toBlocks(await resolveFieldGroupNote(db, checklistTemplateId, fieldGroupId));
  const idx = Math.max(0, Math.min(blockIndex, blocks.length));
  return { before: extractContext(blocks.slice(0, idx), 'end'), after: extractContext(blocks.slice(idx), 'start') };
}

/** Exported for local test harnesses. */
export default function handler(req: Request): Promise<Response> {
  return runNoteGeneration(req, resolveContext, 'ai-field-group-note');
}

if (import.meta.main) Deno.serve(handler);
