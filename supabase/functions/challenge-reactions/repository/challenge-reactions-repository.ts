// Plain data access for `challenge-reactions` — no authorization decisions here, just reads
// `challenge-reactions-access-service.ts` builds on. See `notes/repository/notes-repository.ts`
// for the reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { ReactionType } from '../../../dto/challenge-reactions/challenge-reactions-dto.ts';

/** Deterministic, server-computed — a reaction's identity is entirely `(challengeId, userId)`,
 * same shape `shared/repeats.ts`'s own `rowId` uses for its one-row-per-(owner,user) table. */
function rowId(challengeId: string, userId: string): string {
  return `${challengeId}:${userId}`;
}

export type ChallengeOwnerRow = { id: string; owner_id: string; checklist_template_id: string };

export async function fetchChallengeOwnerAndTemplate(
  db: SupabaseClient,
  challengeId: string,
): Promise<ChallengeOwnerRow | null> {
  const { data, error } = await db
    .from('challenges')
    .select('id, owner_id, checklist_template_id')
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchChallengesOwnerAndTemplate(db: SupabaseClient, ids: string[]): Promise<ChallengeOwnerRow[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('challenges').select('id, owner_id, checklist_template_id').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as ChallengeOwnerRow[];
}

export async function fetchTemplateVisibility(db: SupabaseClient, templateId: string): Promise<{ visibility: string } | null> {
  const { data, error } = await db.from('checklist_templates').select('visibility').eq('id', templateId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchTemplateVisibilities(db: SupabaseClient, ids: string[]): Promise<{ id: string; visibility: string }[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('checklist_templates').select('id, visibility').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; visibility: string }[];
}

export type ReactionRow = { challenge_id: string; user_id: string; reaction: string };

export async function fetchReactionRows(db: SupabaseClient, challengeIds: string[]): Promise<ReactionRow[]> {
  if (!challengeIds.length) return [];
  const { data, error } = await db
    .from('challenge_reactions')
    .select('challenge_id, user_id, reaction')
    .in('challenge_id', challengeIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as ReactionRow[];
}

export async function upsertReaction(
  db: SupabaseClient,
  challengeId: string,
  userId: string,
  reaction: ReactionType,
): Promise<void> {
  const { error } = await db.from('challenge_reactions').upsert({
    id: rowId(challengeId, userId),
    challenge_id: challengeId,
    user_id: userId,
    reaction,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Idempotent — deleting a reaction that isn't there is a 200, same convention every other
 * DELETE in this app follows. */
export async function deleteReaction(db: SupabaseClient, challengeId: string, userId: string): Promise<void> {
  const { error } = await db.from('challenge_reactions').delete().eq('id', rowId(challengeId, userId));
  if (error) throw new Error(error.message);
}
