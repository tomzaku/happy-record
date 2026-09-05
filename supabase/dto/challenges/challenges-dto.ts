// Row mapping + validation for the `challenges` resource. See
// packages/global/src/store/challenge/useChallenge.tsx for the client shape
// this mirrors.

export const CHALLENGE_THEMES = ['classic', 'ignite', 'playful'] as const;
export type ChallengeTheme = (typeof CHALLENGE_THEMES)[number];

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
    // See 20260825010000_challenge_theme.sql — the DB's own CHECK constraint
    // is the real guarantee this is always one of the three; the cast here
    // is just so the client type isn't a bare `string`.
    theme: (r.theme as ChallengeTheme) ?? 'classic',
    // See 20260828000000_challenge_background_image.sql — null for every
    // challenge that hasn't set one, same as most rows never having a theme
    // override.
    backgroundImageUrl: (r.background_image_url as string | null) ?? null,
    // See 20260905020000_challenges_dates.sql — startDate is required client-side (fromChallenge
    // below throws if it's missing on write), endDate stays null for an open-ended challenge.
    startDate: r.start_date as string,
    endDate: (r.end_date as string | null) ?? null,
    // Admin-curated only — see 20260905010000_challenges_public_listing.sql and fromChallenge's
    // own comment on why this is never read from client input.
    isPublicListing: !!r.is_public_listing,
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

  // Falls back to 'classic' rather than throwing — the DB's CHECK
  // constraint is the actual guard against garbage, and a client build
  // that's briefly behind (or a caller that just never sends a theme, e.g.
  // re-saving only the comments toggle via a stale payload) shouldn't 400
  // over it.
  const theme = CHALLENGE_THEMES.includes(e.theme as ChallengeTheme) ? (e.theme as ChallengeTheme) : 'classic';

  // Same "fall back rather than throw" treatment as theme above — the DB's
  // own CHECK is the real guard. Anything that isn't a plausible http(s)
  // URL just clears the background instead of 400ing the whole save, so a
  // typo in this one optional field doesn't block saving the rest of the
  // share config.
  const backgroundImageUrlRaw = typeof e.backgroundImageUrl === 'string' ? e.backgroundImageUrl.trim() : '';
  const backgroundImageUrl =
    backgroundImageUrlRaw && /^https?:\/\//.test(backgroundImageUrlRaw) && backgroundImageUrlRaw.length <= 2000
      ? backgroundImageUrlRaw
      : null;

  // Required — the client always has a value to send (CardShare defaults it to "now" for a
  // brand-new challenge, then hydrates from the existing row on every re-save, same as theme/
  // backgroundImageUrl above), so a missing/invalid one here means a real client bug, not a
  // typo to gracefully fall back from.
  if (typeof e.startDate !== 'string' || !e.startDate || Number.isNaN(Date.parse(e.startDate))) {
    throw new Error('Missing startDate.');
  }

  // Optional — same "typo shouldn't block saving the rest" fallback as theme/backgroundImageUrl:
  // anything that isn't a parseable date just clears it rather than 400ing the whole save.
  const endDate =
    typeof e.endDate === 'string' && e.endDate && !Number.isNaN(Date.parse(e.endDate)) ? e.endDate : null;

  return {
    id: e.id,
    checklist_template_id: e.checklistTemplateId,
    share_records: !!e.shareRecords,
    comments_enabled: !!e.commentsEnabled,
    field_targets: fieldTargets,
    theme,
    background_image_url: backgroundImageUrl,
    start_date: e.startDate,
    end_date: endDate,
    // Deliberately never read from `e` here — see 20260905010000_challenges_public_listing.sql.
    // Omitting the key means an upsert leaves an existing row's value untouched and a fresh row
    // gets the column's own `false` default; there is no way to set this to `true` through this
    // function.
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
