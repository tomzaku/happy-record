// Row mapping + validation for the `challenges` resource. See
// packages/global/src/store/challenge/useChallenge.tsx for the client shape
// this mirrors.

export function toChallenge(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    checklistTemplateId: r.checklist_template_id as string,
    ownerId: r.owner_id as string,
    shareRecords: !!r.share_records,
    commentsEnabled: !!r.comments_enabled,
    // Keyed by the challenge's own (the owner's) field id — see the
    // 20260825000000_challenge_targets.sql migration.
    fieldTargets: (r.field_targets as Record<string, number>) ?? {},
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/** Only what the owner actually sets — id/ownership come from the caller's own session. */
export function fromChallenge(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.checklistTemplateId !== 'string' || !e.checklistTemplateId) {
    throw new Error('Missing checklistTemplateId.');
  }

  let fieldTargets: Record<string, number> = {};
  if (e.fieldTargets && typeof e.fieldTargets === 'object') {
    for (const [fieldId, target] of Object.entries(e.fieldTargets as Record<string, unknown>)) {
      if (typeof target === 'number' && Number.isFinite(target) && target > 0) {
        fieldTargets[fieldId] = target;
      }
    }
  }

  return {
    id: e.id,
    checklist_template_id: e.checklistTemplateId,
    share_records: !!e.shareRecords,
    comments_enabled: !!e.commentsEnabled,
    field_targets: fieldTargets,
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
