// Business logic for `checklists`, between `api/` and `repository/checklists-repository.ts` — no
// real cross-user visibility decision here (every row is already own-row-only), so this stays a
// thin pass-through rather than a `checkPermission`-bearing access-service, but `api/` still
// never queries the DB directly: it always goes through this layer.

import {
  fetchChecklistById,
  fetchChecklistBySlot,
  fetchChecklists,
  removeChecklist,
  upsertChecklist,
} from '../repository/checklists-repository.ts';
import { recordChecklistLog } from '../../../shared/checklistLogs.ts';
import { fetchRepeatRow, occurrenceDayMatches, resolveOccurrenceEnd } from '../../../shared/schedules.ts';
import { ApiError } from '../../../shared/cors.ts';
import type { Ctx } from '../api/checklists-context.ts';

export function listChecklists(
  { db, userId }: Ctx,
  opts: { templateId?: string | null; from?: string | null; to?: string | null },
): Promise<Record<string, unknown>[]> {
  return fetchChecklists(db, userId, opts);
}

export function getChecklistById({ db, userId }: Ctx, id: string): Promise<Record<string, unknown>[]> {
  return fetchChecklistById(db, userId, id);
}

export async function saveChecklist(
  { db, userId }: Ctx,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // The client always sends a real `started_at` (it already knows the template's own
  // byhour/byminute when constructing one — see index.desktop.tsx's own creation effect) — but
  // omits `ended_date` entirely for a fresh occurrence of a *repeating* schedule, since it has no
  // way to know that schedule's own `duration`. A repeating template's own schedule is
  // authoritative for that: `started_at` is checked against it first (`occurrenceDayMatches` —
  // rejects a `started_at` the schedule doesn't actually recur on, the exact class of bug — "today"
  // sent regardless of which day was actually being viewed — behind a real live report), then
  // `ended_date` is filled in as `started_at + duration`. A one-off task's own instance (no
  // repeating schedule) or a direct edit (an explicit `ended_date` already sent, e.g.
  // ScheduleEditDialogs.tsx's own onUpdateChecklist) skips this entirely.
  let resolvedRow = row;
  if (row.ended_date == null) {
    const repeatRow = await fetchRepeatRow(db, { userId, checklistTemplateId: row.checklist_template_id as string });
    if (repeatRow?.byday) {
      if (!occurrenceDayMatches(repeatRow, row.started_at as string)) {
        throw new ApiError(400, `No scheduled occurrence on ${row.started_at as string} for this template.`);
      }
      resolvedRow = { ...row, ended_date: resolveOccurrenceEnd(repeatRow, row.started_at as string) };
    }
  }

  // `id` is the primary key, but one real row per (user, template, day) is also a real constraint
  // (`idx_checklists_user_template_started_unique`) — a client-generated id that drifts from
  // what's already on file for this exact slot (an older row from before a since-changed id
  // scheme, a synced write racing this one) would otherwise upsert a second row into the same slot
  // and hit that unique index as a raw, uncaught constraint violation. Look the slot up first and
  // write through its existing id when there is one, so a same-day resave always converges on one
  // row no matter which id the client sent.
  const existingSlot = await fetchChecklistBySlot(
    db,
    userId,
    resolvedRow.checklist_template_id as string,
    resolvedRow.started_at as string,
  );
  const finalRow = existingSlot && existingSlot.id !== resolvedRow.id ? { ...resolvedRow, id: existingSlot.id } : resolvedRow;

  // This route is a full-row upsert reused for creating a new day's instance, editing one, and
  // checking/unchecking it done (a completedAt patch merged client-side, then re-posted whole —
  // see useChecklists.tsx's own updateChecklist). Only a genuine transition of completed_at
  // (null->set, or set->null for an uncheck) counts as loggable — reading the prior value first is
  // what keeps a later, unrelated resave of an already-completed checklist from re-logging "done"
  // every time.
  const [previous] = await fetchChecklistById(db, userId, finalRow.id as string);
  const previousCompletedAt = previous?.completed_at ?? null;

  await upsertChecklist(db, userId, finalRow);

  if (!previousCompletedAt && finalRow.completed_at) {
    await recordChecklistLog(db, userId, {
      checklistTemplateId: finalRow.checklist_template_id as string,
      checklistId: finalRow.id as string,
      action: 'update',
      detail: 'completed',
    });
  } else if (previousCompletedAt && !finalRow.completed_at) {
    await recordChecklistLog(db, userId, {
      checklistTemplateId: finalRow.checklist_template_id as string,
      checklistId: finalRow.id as string,
      action: 'update',
      detail: 'uncompleted',
    });
  }

  // The caller (a fresh occurrence especially) may not know the real `ended_date` — or even the
  // real `id`, once the slot-resolution above adopted an existing one — until this returns; see
  // save-checklist-handler.ts's own response shape.
  return finalRow;
}

export function deleteChecklist({ db, userId }: Ctx, id: string): Promise<void> {
  return removeChecklist(db, userId, id);
}
