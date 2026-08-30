// `GET /checklist-templates` — one route, two shapes depending on the query string.

import { compose } from '../../../shared/authorize.ts';
import { fetchRepeats } from '../../../shared/repeats.ts';
import { checkCanReadTemplateById, repeatOwnerOf, resolveTemplate } from '../services/checklist-templates-access-service.ts';
import type { Ctx } from './checklist-templates-context.ts';

const MAX_JOINED_TEMPLATES = 200;

/** `?id=` — one template, `compose(checkCanReadTemplateById, core)`. */
const getTemplateById = compose(checkCanReadTemplateById, async ({ db, userId }: Ctx, row: Record<string, unknown> | null) => {
  if (!row) return { templates: [] };
  const repeats = await fetchRepeats(db, 'checklistTemplateId', [repeatOwnerOf(row)], userId);
  return { templates: [resolveTemplate(row, repeats, userId)] };
});

/** No `id` — "all mine, plus anything I've joined a challenge for." No single `checkPermission`
 * to compose here (unlike `getTemplateById` above): the owned half is a plain explicit filter,
 * and the joined half's own visibility check is a batch filter over rows already scoped to ids
 * this caller is known to have joined, not a single allow/deny decision. */
async function listMine({ db, userId }: Ctx) {
  const [{ data: ownedData, error: ownedError }, { data: participantRows, error: participantError }] =
    await Promise.all([
      db.from('checklist_templates').select('*').eq('user_id', userId).order('created_at'),
      // A joined challenge's template is owned by whoever shared it, not the caller — see
      // useJoinChallenge.tsx's own comment on why joining never forks it into a caller-owned
      // row. Without this, "all mine" only ever returns what the ownership filter above already
      // covers, and a joined challenge silently never appears on the home/tasks page again after
      // the in-memory store resets (a reload, a fresh sign-in) — the one real fetch of it (this
      // route) is ownership-only, and useJoinChallenge.tsx's own merge is transient.
      db.from('challenge_participants').select('checklist_template_id').eq('user_id', userId).limit(MAX_JOINED_TEMPLATES),
    ]);
  if (ownedError) throw new Error(ownedError.message);
  if (participantError) throw new Error(participantError.message);

  const ownedRows = (ownedData ?? []) as Record<string, unknown>[];
  const ownedIds = new Set(ownedRows.map(r => r.id as string));
  const joinedIds = [
    ...new Set(((participantRows ?? []) as Record<string, unknown>[]).map(r => r.checklist_template_id as string)),
  ].filter(id => !ownedIds.has(id));

  const { data: joinedData, error: joinedError } = joinedIds.length
    ? await db.from('checklist_templates').select('*').in('id', joinedIds)
    : { data: [] as Record<string, unknown>[], error: null };
  if (joinedError) throw new Error(joinedError.message);

  // Explicit now, replacing what used to be RLS's own "owner OR public" filter on this query:
  // sharing a template always flips it to `visibility: 'public'` (CardShare's generateShareUrl)
  // before a challenge can even exist for it, so this is normally a no-op — but a template that
  // got unshared *after* this caller joined it must stop appearing here too, the same graceful
  // degrade RLS gave for free before.
  const visibleJoinedRows = ((joinedData ?? []) as Record<string, unknown>[]).filter(r => r.visibility === 'public');

  const rows = [...ownedRows, ...visibleJoinedRows];
  const repeats = await fetchRepeats(db, 'checklistTemplateId', rows.map(repeatOwnerOf), userId);
  // resolveTemplate's viewer/owner resolution actually matters here now: a joined row's
  // `user_id` is the sharer, not the caller, so a personal reminder override
  // (`repeats.user_id === userId`) has to win over the owner's own schedule.
  return { templates: rows.map(r => resolveTemplate(r, repeats, userId)) };
}

export async function listChecklistTemplatesHandler(ctx: Ctx) {
  return ctx.url.searchParams.get('id') ? getTemplateById(ctx) : listMine(ctx);
}
