// Plain data access for `media` — no authorization decisions here, just reads
// `media-access-service.ts` builds on. See `notes/repository/notes-repository.ts` for the
// reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { MediaRow } from '../../../dto/media/media-dto.ts';

export async function fetchMediaById(db: SupabaseClient, id: string): Promise<MediaRow | null> {
  const { data, error } = await db.from('media').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as MediaRow) ?? null;
}

export async function insertMedia(db: SupabaseClient, row: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('media').insert(row);
  if (error) throw new Error(error.message);
}

export async function deleteMediaRow(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from('media').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchExpiredMedia(db: SupabaseClient, limit: number): Promise<MediaRow[]> {
  const { data, error } = await db
    .from('media')
    .select('*')
    .lte('expires_at', new Date().toISOString())
    .order('expires_at')
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as MediaRow[];
}

export async function deleteMediaRows(db: SupabaseClient, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await db.from('media').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

/** Nulls out any `checklist_records.value_text` still pointing at a media id that's about to be
 * (or already was) deleted — a stale-but-harmless reference otherwise lingers forever, and the
 * client's own `useMediaUrl` would keep hitting a real 404 on every render of that record instead
 * of the field simply reading as never-filled-in. */
export async function clearChecklistRecordReferences(db: SupabaseClient, mediaIds: string[]): Promise<void> {
  if (!mediaIds.length) return;
  const { error } = await db
    .from('checklist_records')
    .update({ value_text: null, updated_at: new Date().toISOString() })
    .in('value_text', mediaIds);
  if (error) throw new Error(error.message);
}

/** The `checklist_records` row (if any) whose `value_text` holds this media id — how
 * `checkCanReadMedia` learns which `checklist_template_id` a non-owner's peer-visibility check
 * needs to run against. A media id not yet attached to any submitted record (still mid-upload, or
 * never submitted) has none — the caller treats that as "nothing to authorize against yet." */
export async function fetchChecklistTemplateIdForMedia(
  db: SupabaseClient,
  mediaOwnerId: string,
  mediaId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('checklist_records')
    .select('checklist_template_id')
    .eq('user_id', mediaOwnerId)
    .eq('value_text', mediaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.checklist_template_id as string) ?? null;
}

/**
 * Is `viewerId` a fellow participant of a challenge (for `checklistTemplateId`) that
 * `mediaOwnerId` also participates in, with that challenge's own `share_records` turned on? Same
 * "build the visible roster" shape `challenges-service.ts`'s `buildDashboard` uses (see
 * `fetchParticipantsForChallenge`/`visibleUserIds` there), scoped down to one target user instead
 * of the whole roster — this is the one new cross-participant read this app has for raw record
 * content (see media-dto.ts's own header comment on why that's a real product decision, not just
 * plumbing, and CLAUDE.md's `20260824000000_challenges.sql` note on why `checklist_records`
 * itself never got this).
 */
export async function fetchSharedChallengeParticipation(
  db: SupabaseClient,
  opts: { mediaOwnerId: string; viewerId: string; checklistTemplateId: string },
): Promise<boolean> {
  const { data: targetRows, error: targetError } = await db
    .from('challenge_participants')
    .select('challenge_id')
    .eq('user_id', opts.mediaOwnerId)
    .eq('checklist_template_id', opts.checklistTemplateId);
  if (targetError) throw new Error(targetError.message);
  const challengeIds = ((targetRows ?? []) as { challenge_id: string }[]).map(r => r.challenge_id);
  if (!challengeIds.length) return false;

  const { data: viewerRows, error: viewerError } = await db
    .from('challenge_participants')
    .select('challenge_id')
    .eq('user_id', opts.viewerId)
    .in('challenge_id', challengeIds);
  if (viewerError) throw new Error(viewerError.message);
  const sharedChallengeIds = ((viewerRows ?? []) as { challenge_id: string }[]).map(r => r.challenge_id);
  if (!sharedChallengeIds.length) return false;

  const { data: challengeRows, error: challengeError } = await db
    .from('challenges')
    .select('id')
    .in('id', sharedChallengeIds)
    .eq('share_records', true);
  if (challengeError) throw new Error(challengeError.message);
  return ((challengeRows ?? []) as { id: string }[]).length > 0;
}
