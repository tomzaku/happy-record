// Row mapping + validation for the `checklist-templates` resource. See
// packages/global/src/store/checklists/useChecklistTemplates.tsx for the
// client shape (`ChecklistTemplate`) this mirrors.
//
// `repeat`, `avatar`, `fieldGroups`/`field_groups` and `tags` round-trip as
// given — they're config the server never filters on, not relational data
// (see the migration's comment on why only ownership + visibility are real
// columns). `flagId`/`flag_id` is the exception: a real foreign key into
// `flags` (see 20260821030000_flags.sql) — one flag groups many templates,
// unlike `tags`. The deprecated `records: string[]` field is dropped: it's
// unused in the client type already (`@deprecated use groups instead`) and
// never makes it to the wire here.

export function toChecklistTemplate(r: Record<string, unknown>) {
  const hasRepeat = [
    r.repeat_minute,
    r.repeat_hour,
    r.repeat_day_of_month,
    r.repeat_month,
    r.repeat_day_of_week,
    r.repeat_started_at,
  ].some(v => v !== null && v !== undefined);

  return {
    id: r.id as string,
    title: r.title as string,
    avatar: (r.avatar as Record<string, unknown>) ?? {},
    repeat: hasRepeat
      ? {
          minute: r.repeat_minute as string,
          hour: r.repeat_hour as string,
          dayOfMonth: r.repeat_day_of_month as string,
          month: r.repeat_month as string,
          dayOfWeek: r.repeat_day_of_week as string,
          startedAt: r.repeat_started_at as string,
          ...(r.repeat_completed_at ? { completedAt: r.repeat_completed_at as string } : {}),
        }
      : undefined,
    createdAt: r.created_at as string,
    records: [] as string[],
    fieldGroups: (r.field_groups as unknown[]) ?? [],
    tags: (r.tags as string[]) ?? [],
    visibility: (r.visibility as string) ?? 'private',
    updatedAt: r.updated_at as string,
    ...(r.flag_id ? { flagId: r.flag_id as string } : {}),
  };
}

/**
 * Partial update — only the keys the caller actually sent become columns to
 * write. Used by the PATCH route so editing one field (a note, a schedule)
 * can't clobber other columns with a stale client copy the way a full-row
 * `fromChecklistTemplate` upsert would (that stays POST/create-only).
 */
export function patchChecklistTemplate(e: Record<string, unknown>): Record<string, unknown> {
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  const patch: Record<string, unknown> = {};

  if ('title' in e) {
    if (typeof e.title !== 'string' || !e.title) throw new Error('Invalid title.');
    patch.title = e.title;
  }
  if ('avatar' in e) {
    patch.avatar = e.avatar && typeof e.avatar === 'object' ? e.avatar : {};
  }
  if ('repeat' in e) {
    const repeat = (e.repeat && typeof e.repeat === 'object' ? e.repeat : {}) as Record<string, unknown>;
    patch.repeat_minute = str(repeat.minute);
    patch.repeat_hour = str(repeat.hour);
    patch.repeat_day_of_month = str(repeat.dayOfMonth);
    patch.repeat_month = str(repeat.month);
    patch.repeat_day_of_week = str(repeat.dayOfWeek);
    patch.repeat_started_at = str(repeat.startedAt);
    patch.repeat_completed_at = str(repeat.completedAt);
  }
  if ('fieldGroups' in e) {
    patch.field_groups = Array.isArray(e.fieldGroups) ? e.fieldGroups : [];
  }
  if ('tags' in e) {
    patch.tags = Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [];
  }
  if ('visibility' in e) {
    patch.visibility = e.visibility === 'public' ? 'public' : 'private';
  }
  if ('flagId' in e) {
    patch.flag_id = str(e.flagId);
  }

  // Postgres only fills the default on insert, not update — every write
  // has to set this explicitly, partial or not.
  patch.updated_at = new Date().toISOString();
  return patch;
}

/**
 * Merges per-group patches (`{ id, ...changedKeys }`) into the `field_groups`
 * already stored for this row. `field_groups` is one jsonb column — there's
 * no partial-column write for "just this group's note", so the PATCH route
 * reads the current array, merges here, and writes the whole array back.
 * That's still one full column write, but the request body itself only ever
 * carried what actually changed, and unrecognized/reordered ids are left
 * alone rather than dropped, so a patch built against a slightly stale
 * client copy can't delete a group it doesn't know about.
 */
export function mergeFieldGroupPatches(
  current: Record<string, unknown>[],
  patches: Record<string, unknown>[],
): Record<string, unknown>[] {
  return current.map(group => {
    const patch = patches.find(p => p.id === group.id);
    return patch ? { ...group, ...patch } : group;
  });
}

export function fromChecklistTemplate(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.title !== 'string' || !e.title) throw new Error('Missing title.');

  const repeat = (e.repeat && typeof e.repeat === 'object' ? e.repeat : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : null);

  return {
    id: e.id,
    title: e.title,
    avatar: e.avatar && typeof e.avatar === 'object' ? e.avatar : {},
    repeat_minute: str(repeat.minute),
    repeat_hour: str(repeat.hour),
    repeat_day_of_month: str(repeat.dayOfMonth),
    repeat_month: str(repeat.month),
    repeat_day_of_week: str(repeat.dayOfWeek),
    repeat_started_at: str(repeat.startedAt),
    repeat_completed_at: str(repeat.completedAt),
    field_groups: Array.isArray(e.fieldGroups) ? e.fieldGroups : [],
    tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
    visibility: e.visibility === 'public' ? 'public' : 'private',
    flag_id: str(e.flagId),
    created_at: str(e.createdAt) ?? new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
