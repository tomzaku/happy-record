// Row mapping + queries for the `repeats` table — one schedule row per owner (a
// checklist_template's own top-level schedule, or one field_group's override), never both on the
// same row. See 20260830000000_repeats_table.sql for why this is a real table shared by both
// owners instead of jsonb on field_groups / columns on checklist_templates.
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

function ownerId(owner: Owner): string {
  // Prefixed so the two id spaces can never collide on this table's own primary key — see the
  // migration's own note.
  if (owner.checklistTemplateId) return `ct:${owner.checklistTemplateId}`;
  if (owner.fieldGroupId) return `fg:${owner.fieldGroupId}`;
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
    id: ownerId(owner),
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

/** Every `repeats` row for a batch of owners at once, keyed by owner id — so a list() route reads
 * one extra query total, not one per row on the page. */
export async function fetchRepeats(
  db: SupabaseClient,
  ownerKind: 'checklistTemplateId' | 'fieldGroupId',
  ownerIds: string[],
): Promise<Record<string, Row>> {
  const byOwner: Record<string, Row> = {};
  if (!ownerIds.length) return byOwner;

  const column = OwnerColumn[ownerKind];
  const { data, error } = await db.from('repeats').select('*').in(column, ownerIds);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as Row[]) byOwner[row[column] as string] = row;
  return byOwner;
}

/**
 * Upserts or clears the one `repeats` row for an owner — called right after saving/patching the
 * owner's own row. Mirrors the old full-row-upsert shape (every repeat_* column always written,
 * null or not): a missing/empty `repeat` deletes any existing schedule rather than leaving a
 * stale one behind.
 */
export async function saveRepeat(db: SupabaseClient, repeat: unknown, owner: Owner): Promise<void> {
  if (!repeat || typeof repeat !== 'object') {
    const column = OwnerColumn[owner.checklistTemplateId ? 'checklistTemplateId' : 'fieldGroupId'];
    const { error } = await db.from('repeats').delete().eq(column, owner.checklistTemplateId ?? owner.fieldGroupId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await db.from('repeats').upsert(fromRepeat(repeat, owner));
  if (error) throw new Error(error.message);
}
