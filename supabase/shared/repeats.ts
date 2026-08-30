// Row mapping + queries for the `repeats` table — one schedule row per (owner, user) pair, where
// an owner is a checklist_template's own top-level schedule or one field_group's override. See
// 20260830000000_repeats_table.sql for why a template can have more than one row (the owner's own
// default, plus a challenge participant's personal override) and how visibility is scoped.
//
// Not exposed as its own resource/edge function — nothing reads a repeat independent of its
// owner, same "no dedicated resource" call CLAUDE.md already makes for `submissions`. Unlike
// `submissions` (only ever touched from checklist-records), this genuinely is shared by two
// different resources (checklist-templates and field-groups), so the actual queries live here too
// rather than being copy-pasted into both index.ts files.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Row = Record<string, unknown>;
type Owner = { userId: string; checklistTemplateId?: string; fieldGroupId?: string };

const OwnerColumn = {
  checklistTemplateId: 'checklist_template_id',
  fieldGroupId: 'field_group_id',
} as const;

function ownerColumn(owner: Owner): (typeof OwnerColumn)[keyof typeof OwnerColumn] {
  if (owner.checklistTemplateId) return OwnerColumn.checklistTemplateId;
  if (owner.fieldGroupId) return OwnerColumn.fieldGroupId;
  throw new Error('Missing repeat owner.');
}

function rowId(owner: Owner): string {
  // Prefixed, and includes the acting user, so (a) the two owner id spaces can never collide on
  // this table's own primary key, and (b) an owner's own row and a participant's override for the
  // same owner never collide either — see the migration's own note.
  if (owner.checklistTemplateId) return `ct:${owner.checklistTemplateId}:${owner.userId}`;
  if (owner.fieldGroupId) return `fg:${owner.fieldGroupId}:${owner.userId}`;
  throw new Error('Missing repeat owner.');
}

/** Client-shape `repeat` object from a `repeats` row, or `undefined` for "no schedule" — same
 * convention as when this lived in columns/jsonb directly on the owner's own row. */
export function toRepeat(row: Row | undefined): Record<string, unknown> | undefined {
  const hasAny = !!row && [row.minute, row.hour, row.day_of_month, row.month, row.day_of_week, row.started_at]
    .some(v => v !== null && v !== undefined);
  if (!hasAny) return undefined;

  return {
    minute: row!.minute as string,
    hour: row!.hour as string,
    dayOfMonth: row!.day_of_month as string,
    month: row!.month as string,
    dayOfWeek: row!.day_of_week as string,
    startedAt: row!.started_at as string,
    ...(row!.completed_at ? { completedAt: row!.completed_at as string } : {}),
  };
}

function fromRepeat(repeat: unknown, owner: Owner): Row {
  const e = (repeat && typeof repeat === 'object' ? repeat : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);

  return {
    id: rowId(owner),
    user_id: owner.userId,
    checklist_template_id: owner.checklistTemplateId ?? null,
    field_group_id: owner.fieldGroupId ?? null,
    minute: str(e.minute),
    hour: str(e.hour),
    day_of_month: str(e.dayOfMonth),
    month: str(e.month),
    day_of_week: str(e.dayOfWeek),
    started_at: str(e.startedAt),
    completed_at: str(e.completedAt),
    updated_at: new Date().toISOString(),
  };
}

/** One owner (a checklist_template or field_group row the caller already has) as `fetchRepeats`
 * needs to know it: its own id, who owns *it*, and whether it's `visibility: 'public'` — the two
 * facts that decide whether a row other than the caller's own is visible. */
export type RepeatOwner = { id: string; ownerUserId: string; isPublic: boolean };

/**
 * Every `repeats` row for a batch of owners at once, keyed by owner id, each value the full list
 * of rows for that owner (the owner's own default plus however many participant overrides exist)
 * — so a list() route reads one extra query total, not one per row on the page.
 *
 * Used to rely on RLS to narrow this to "rows I own, plus the owner's own row for anything
 * public" — see 20260830000000_repeats_table.sql's own "Owner's schedule for a public checklist
 * template is readable by anyone" policy, scoped specifically to the *owner's* row, never a
 * participant's personal override on that same owner. Replicated here explicitly now that this
 * runs on the service-role client: fetches broadly (scoped only to `owners`' ids, same as
 * before), then keeps a row only if it's the caller's own, or it's the owner's own row on an
 * owner that's actually public — anything else (another participant's override on a public
 * template, or any row at all on a private one) gets filtered out before a caller ever sees it.
 */
export async function fetchRepeats(
  db: SupabaseClient,
  ownerKind: 'checklistTemplateId' | 'fieldGroupId',
  owners: RepeatOwner[],
  callerUserId: string,
): Promise<Record<string, Row[]>> {
  const byOwner: Record<string, Row[]> = {};
  if (!owners.length) return byOwner;

  const column = OwnerColumn[ownerKind];
  const ownerById = new Map(owners.map(o => [o.id, o]));
  const { data, error } = await db.from('repeats').select('*').in(column, owners.map(o => o.id));
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as Row[]) {
    const key = row[column] as string;
    const owner = ownerById.get(key);
    if (!owner) continue; // defensive — every row's owner column is one of the ids just queried
    const visible = row.user_id === callerUserId || (owner.isPublic && row.user_id === owner.ownerUserId);
    if (!visible) continue;
    (byOwner[key] ??= []).push(row);
  }
  return byOwner;
}

/**
 * The one `repeats` row that actually applies for a given viewer — their own row (an override, or
 * their own schedule if they *are* the owner) if they have one, otherwise the owner's row. Not a
 * merge of the two: a participant who's set their own time follows it entirely, the same way a
 * more specific CSS rule replaces a less specific one rather than blending with it.
 */
export function pickRepeat(rows: Row[] | undefined, viewerUserId: string, ownerUserId: string): Row | undefined {
  if (!rows?.length) return undefined;
  return rows.find(r => r.user_id === viewerUserId) ?? rows.find(r => r.user_id === ownerUserId);
}

/**
 * Upserts or clears the caller's own `repeats` row for an owner — called right after
 * saving/patching the owner's own row (when the caller is the owner) or from a participant's own
 * "notify me at a different time" write (when it isn't) — `owner.userId` is always the acting
 * caller, never trusted from the request body, so this can never touch anyone else's row (the
 * deterministic id above guarantees it lands on the caller's own row even when `checklistTemplateId`
 * belongs to someone else's template). A missing/empty `repeat` deletes the caller's row rather
 * than leaving a stale one behind, mirroring the old full-row-upsert shape (every repeat_* column
 * always written, null or not).
 */
export async function saveRepeat(db: SupabaseClient, repeat: unknown, owner: Owner): Promise<void> {
  if (!repeat || typeof repeat !== 'object') {
    const { error } = await db
      .from('repeats')
      .delete()
      .eq(ownerColumn(owner), owner.checklistTemplateId ?? owner.fieldGroupId)
      .eq('user_id', owner.userId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await db.from('repeats').upsert(fromRepeat(repeat, owner));
  if (error) throw new Error(error.message);
}
