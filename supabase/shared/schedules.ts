// Row mapping + queries for the `schedules` table (renamed from `repeats` —
// 20260907000000_repeats_rename_to_schedules.sql — "schedule" is the broader concept this table
// anchors now that a schedule can also carry exception rows, see scheduleExceptions.ts, which
// aren't a recurrence rule at all). One schedule row per (owner, user) pair, where an owner is a
// checklist_template's own top-level schedule or one field_group's override. See
// 20260830000000_repeats_table.sql for why a template can have more than one row (the owner's own
// default, plus a challenge participant's personal override) and how visibility is scoped — that
// migration (and every other one before the rename) still says `repeats` throughout; only the
// table's name changed, not its shape or history.
//
// Not exposed as its own resource/edge function — nothing reads a schedule independent of its
// owner, same "no dedicated resource" call CLAUDE.md already makes for `submissions`. Unlike
// `submissions` (only ever touched from checklist-records), this genuinely is shared by two
// different resources (checklist-templates and field-groups), so the actual queries live here too
// rather than being copy-pasted into both index.ts files.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Row = Record<string, unknown>;
type Owner = { userId: string; checklistTemplateId?: string; fieldGroupId?: string };

/** DEBUG ONLY — a human-checkable summary of the structured columns below, so a row is readable
 * at a glance in the DB (Supabase studio / psql) instead of cross-referencing six separate
 * columns. No app code, client or server, ever parses this back — it is not the source of truth,
 * just written fresh on every save. */
function buildDebugRRuleString(parts: {
  freq: string | null;
  interval: number | null;
  byday: string | null;
  byhour: number | null;
  byminute: number | null;
  count: number | null;
  until: string | null;
}): string | null {
  if (!parts.byday) return null;
  const segments = [`FREQ=${parts.freq ?? 'WEEKLY'}`];
  if (parts.interval && parts.interval !== 1) segments.push(`INTERVAL=${parts.interval}`);
  segments.push(`BYDAY=${parts.byday}`);
  if (parts.byhour != null) segments.push(`BYHOUR=${parts.byhour}`);
  if (parts.byminute != null) segments.push(`BYMINUTE=${parts.byminute}`);
  if (parts.count != null) segments.push(`COUNT=${parts.count}`);
  if (parts.until) segments.push(`UNTIL=${parts.until.replace(/[-:]/g, '').split('.')[0]}Z`);
  return `RRULE:${segments.join(';')}`;
}

const OwnerColumn = {
  checklistTemplateId: 'checklist_template_id',
  fieldGroupId: 'field_group_id',
} as const;

function ownerColumn(owner: Owner): (typeof OwnerColumn)[keyof typeof OwnerColumn] {
  if (owner.checklistTemplateId) return OwnerColumn.checklistTemplateId;
  if (owner.fieldGroupId) return OwnerColumn.fieldGroupId;
  throw new Error('Missing repeat owner.');
}

/** Exported — scheduleExceptions.ts derives its own id from the same (owner, user) schedule id
 * plus an exception date, so an exception can only ever be looked up through a real schedule row. */
export function rowId(owner: Owner): string {
  // Prefixed, and includes the acting user, so (a) the two owner id spaces can never collide on
  // this table's own primary key, and (b) an owner's own row and a participant's override for the
  // same owner never collide either — see the migration's own note.
  if (owner.checklistTemplateId) return `ct:${owner.checklistTemplateId}:${owner.userId}`;
  if (owner.fieldGroupId) return `fg:${owner.fieldGroupId}:${owner.userId}`;
  throw new Error('Missing repeat owner.');
}

/** Client-shape `repeat` object from a `schedules` row, or `undefined` for "no schedule" — same
 * convention as when this lived in columns/jsonb directly on the owner's own row. The client
 * shape now matches the row's own rrule-named columns directly (byday/byhour/byminute/until/
 * freq) — no translation at this boundary any more, see CLAUDE.md's "server schema can differ
 * from client shape" for when that's still worth doing (it wasn't here: both sides already meant
 * the same rrule concepts, just under different names). `rrule` (the debug-only column) is
 * deliberately never returned here. */
export function toRepeat(row: Row | undefined): Record<string, unknown> | undefined {
  const hasAny = !!row && [row.byday, row.byhour, row.byminute, row.started_at]
    .some(v => v !== null && v !== undefined);
  if (!hasAny) return undefined;

  return {
    byminute: row!.byminute != null ? String(row!.byminute) : '',
    byhour: row!.byhour != null ? String(row!.byhour) : '',
    byday: (row!.byday as string) ?? '',
    startedAt: row!.started_at as string,
    ...(row!.completed_at ? { completedAt: row!.completed_at as string } : {}),
    ...(row!.until ? { until: row!.until as string } : {}),
    ...(row!.timezone ? { timezone: row!.timezone as string } : {}),
    ...(row!.interval != null && (row!.interval as number) !== 1 ? { interval: row!.interval as number } : {}),
    ...(row!.count != null ? { count: row!.count as number } : {}),
    ...(row!.freq ? { freq: row!.freq as string } : {}),
    // Not-null with a `default true` at the column level (see the migration), so this always has
    // a real value — spelled as `!== false` (not `?? true`) so an explicit `false` on the row
    // survives even if some future caller ever passes a nullish placeholder through by mistake.
    recurring: row!.recurring !== false,
  };
}

// Exported for direct unit testing (see schedules.test.ts) — pure and I/O-free, same reasoning
// toRepeat is already exported for.
export function fromRepeat(repeat: unknown, owner: Owner): Row {
  const e = (repeat && typeof repeat === 'object' ? repeat : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);

  // A checklist_template's own row always gets a `started_at` — the client is expected to send
  // one (see createTaskUtil.ts, ChecklistGenericInfo's own handleSaveStartDate), but every write
  // here is a full overwrite of the row (see this function's own doc comment above `saveRepeat`),
  // so a caller that ever omits it would otherwise null out an existing date, not just leave a
  // fresh one unset. Defaulting to "now" server-side is the actual guarantee that can't be
  // bypassed by a client bug. Never applies to a field_group's own row — `started_at` isn't a
  // concept there at all (see the migration's own "Template-only fields... left null for a
  // group's row"), so defaulting it would write a value nothing ever reads.
  const startedAt = owner.checklistTemplateId
    ? (str(e.startedAt) ?? new Date().toISOString())
    : str(e.startedAt);

  const byday = typeof e.byday === 'string' && e.byday !== '' ? e.byday : null;
  const byhour = typeof e.byhour === 'string' && e.byhour !== '' ? Number(e.byhour) : null;
  const byminute = typeof e.byminute === 'string' && e.byminute !== '' ? Number(e.byminute) : null;
  const interval = typeof e.interval === 'number' ? e.interval : null;
  const count = typeof e.count === 'number' ? e.count : null;
  const until = str(e.until);
  // The client is expected to send `freq` explicitly now (always `'WEEKLY'` today — see
  // ChecklistTemplate['repeat'].freq's own comment), but a missing/invalid value still falls back
  // to the same derivation this used to do unconditionally, so an older client build (or a
  // `repeat` with a `byday` but no `freq`) doesn't silently write a null `freq` next to a real
  // schedule.
  const freq = typeof e.freq === 'string' && e.freq ? e.freq : (byday ? 'WEEKLY' : null);
  // Defaults true (see the migration) rather than being left to the column default on every
  // write, since this is a full-row upsert (see saveRepeat's own doc comment) — an older client
  // build that never sends `recurring` at all must still write `true`, not silently fall through
  // to whatever null would coerce to.
  const recurring = typeof e.recurring === 'boolean' ? e.recurring : true;

  return {
    id: rowId(owner),
    user_id: owner.userId,
    checklist_template_id: owner.checklistTemplateId ?? null,
    field_group_id: owner.fieldGroupId ?? null,
    freq,
    interval,
    byday,
    byhour,
    byminute,
    count,
    until,
    recurring,
    rrule: buildDebugRRuleString({ freq, interval, byday, byhour, byminute, count, until }),
    started_at: startedAt,
    completed_at: str(e.completedAt),
    timezone: str(e.timezone),
    updated_at: new Date().toISOString(),
  };
}

/** One owner (a checklist_template or field_group row the caller already has) as `fetchRepeats`
 * needs to know it: its own id, who owns *it*, and whether it's `visibility: 'public'` — the two
 * facts that decide whether a row other than the caller's own is visible. */
export type RepeatOwner = { id: string; ownerUserId: string; isPublic: boolean };

/**
 * Every `schedules` row for a batch of owners at once, keyed by owner id, each value the full list
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
  const { data, error } = await db.from('schedules').select('*').in(column, owners.map(o => o.id));
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
 * The one `schedules` row that actually applies for a given viewer — their own row (an override, or
 * their own schedule if they *are* the owner) if they have one, otherwise the owner's row. Not a
 * merge of the two: a participant who's set their own time follows it entirely, the same way a
 * more specific CSS rule replaces a less specific one rather than blending with it.
 */
export function pickRepeat(rows: Row[] | undefined, viewerUserId: string, ownerUserId: string): Row | undefined {
  if (!rows?.length) return undefined;
  return rows.find(r => r.user_id === viewerUserId) ?? rows.find(r => r.user_id === ownerUserId);
}

/** One specific owner+user's own row, raw — no visibility filtering (unlike `fetchRepeats`,
 * built for a batch read gated by who's allowed to see what). Used for copying a schedule
 * between two specific, already-known users (see `challenge-participants`'s own join handler,
 * which seeds a new participant's own repeat from the template owner's current one) rather than
 * resolving what a viewer may see. */
export async function fetchRepeatRow(db: SupabaseClient, owner: Owner): Promise<Row | null> {
  const { data, error } = await db.from('schedules').select('*').eq('id', rowId(owner)).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row) ?? null;
}

/**
 * Upserts or clears the caller's own `schedules` row for an owner — called right after
 * saving/patching the owner's own row (when the caller is the owner) or from a participant's own
 * "notify me at a different time" write (when it isn't) — `owner.userId` is always the acting
 * caller, never trusted from the request body, so this can never touch anyone else's row (the
 * deterministic id above guarantees it lands on the caller's own row even when `checklistTemplateId`
 * belongs to someone else's template). A missing/empty `repeat` deletes the caller's row rather
 * than leaving a stale one behind, mirroring the old full-row-upsert shape (every repeat_* column
 * always written, null or not).
 *
 * Deleting a schedule this way also cascades to that row's own `schedule_exceptions` (FK `on
 * delete cascade` — see 20260907010000_schedule_exceptions_table.sql), so a cleared schedule never
 * leaves an orphaned "skip this date" behind for a recurrence that no longer exists.
 */
export async function saveRepeat(db: SupabaseClient, repeat: unknown, owner: Owner): Promise<void> {
  if (!repeat || typeof repeat !== 'object') {
    const { error } = await db
      .from('schedules')
      .delete()
      .eq(ownerColumn(owner), owner.checklistTemplateId ?? owner.fieldGroupId)
      .eq('user_id', owner.userId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await db.from('schedules').upsert(fromRepeat(repeat, owner));
  if (error) throw new Error(error.message);
}
