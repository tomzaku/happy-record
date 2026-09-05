// Business logic for `checklist-templates` that isn't a permission decision — see
// `checklist-templates-access-service.ts` for those (`repeatOwnerOf`/`resolveTemplate` also live
// there since both this and the access-service's own `GET /:id` core need them). Thin
// composition on top of `repository/checklist-templates-repository.ts`; `api/` never reaches in
// there directly.

import { fetchRepeats, saveRepeat } from '../../../shared/repeats.ts';
import { recordChecklistLog } from '../../../shared/checklistLogs.ts';
import {
  fetchJoinedTemplateIds,
  fetchOwnedTemplates,
  fetchTemplateRow,
  fetchTemplatesByIds,
  patchTemplate,
  removeTemplate,
  upsertTemplate,
} from '../repository/checklist-templates-repository.ts';
import { repeatOwnerOf, resolveTemplate } from './checklist-templates-access-service.ts';
import type { Ctx } from '../api/checklist-templates-context.ts';

const MAX_JOINED_TEMPLATES = 200;

export async function listOwnedAndJoinedTemplates({ db, userId }: Ctx) {
  const ownedRows = await fetchOwnedTemplates(db, userId);
  const ownedIds = new Set(ownedRows.map(r => r.id as string));

  const joinedIds = (await fetchJoinedTemplateIds(db, userId, MAX_JOINED_TEMPLATES)).filter(id => !ownedIds.has(id));
  const joinedRows = await fetchTemplatesByIds(db, joinedIds);
  // Explicit now, replacing what used to be RLS's own "owner OR public" filter on this query:
  // sharing a template always flips it to `visibility: 'public'` (CardShare's generateShareUrl)
  // before a challenge can even exist for it, so this is normally a no-op — but a template that
  // got unshared *after* this caller joined it must stop appearing here too, the same graceful
  // degrade RLS gave for free before.
  const visibleJoinedRows = joinedRows.filter(r => r.visibility === 'public');

  const rows = [...ownedRows, ...visibleJoinedRows];
  const repeats = await fetchRepeats(db, 'checklistTemplateId', rows.map(repeatOwnerOf), userId);
  // resolveTemplate's viewer/owner resolution actually matters here now: a joined row's `user_id`
  // is the sharer, not the caller, so a personal reminder override (`repeats.user_id === userId`)
  // has to win over the owner's own schedule.
  return rows.map(r => resolveTemplate(r, repeats, userId));
}

export async function getTemplateWithRepeat({ db, userId }: Ctx, row: Record<string, unknown>) {
  const repeats = await fetchRepeats(db, 'checklistTemplateId', [repeatOwnerOf(row)], userId);
  return resolveTemplate(row, repeats, userId);
}

export async function saveTemplate({ db, userId }: Ctx, row: Record<string, unknown>, repeat: unknown): Promise<void> {
  // Read before writing — this route is a full-row upsert reused for both a genuine create and
  // `updateChecklistTemplate`'s own "no local copy yet" fallback (see useChecklistTemplates.tsx),
  // so "this route was hit" isn't a reliable "create" signal on its own; only a row that didn't
  // exist yet actually is one.
  const existing = await fetchTemplateRow(db, row.id as string);
  await upsertTemplate(db, userId, row);
  // After the template row exists — repeats.checklist_template_id is a real FK, so the parent has
  // to be there first.
  await saveRepeat(db, repeat, { userId, checklistTemplateId: row.id as string });
  if (!existing) {
    await recordChecklistLog(db, userId, { checklistTemplateId: row.id as string, action: 'create' });
  }
}

export async function updateTemplate(
  { db, userId }: Ctx,
  id: string,
  patch: Record<string, unknown>,
  repeat: { present: boolean; value: unknown },
): Promise<void> {
  await patchTemplate(db, userId, id, patch);
  // Deliberately not gated by the same ownership check as `patch` — `saveRepeat` always writes to
  // the *caller's own* row, so a challenge participant PATCHing the owner's template with
  // `{ repeat: {...} }` sets their own personal reminder without touching the owner's schedule or
  // needing to own the template at all.
  if (repeat.present) {
    await saveRepeat(db, repeat.value, { userId, checklistTemplateId: id });
  }
}

export async function deleteTemplate({ db, userId }: Ctx, id: string): Promise<void> {
  // DELETE is idempotent (removing what isn't there is a no-op, not an error) — read first so a
  // repeat/no-op delete on someone else's id, an already-gone id, or an already soft-deleted row
  // (removeTemplate no longer removes the row at all — see its own comment) doesn't log a
  // duplicate/phantom entry.
  const existing = await fetchTemplateRow(db, id);
  await removeTemplate(db, userId, id);
  if (existing && existing.user_id === userId && !existing.deleted_at) {
    await recordChecklistLog(db, userId, { checklistTemplateId: id, action: 'delete' });
  }
}
