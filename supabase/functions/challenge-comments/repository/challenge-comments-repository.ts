// Plain data access for `challenge-comments` — no authorization decisions here, just reads
// `challenge-comments-access-service.ts` builds on. See `notes/repository/notes-repository.ts`
// for the reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchParticipantRow(
  db: SupabaseClient,
  challengeId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await db
    .from('challenge_participants')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchOwnedChallenge(
  db: SupabaseClient,
  challengeId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await db
    .from('challenges')
    .select('id')
    .eq('id', challengeId)
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** For the post handler's own preconditions — whether comments are on, and who owns the
 * challenge (a participant still has to prove membership separately; see
 * `fetchParticipantRow`). */
export async function fetchChallengeForPosting(
  db: SupabaseClient,
  challengeId: string,
): Promise<{ id: string; owner_id: string; comments_enabled: boolean } | null> {
  const { data, error } = await db
    .from('challenges')
    .select('id, owner_id, comments_enabled')
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchComments(
  db: SupabaseClient,
  challengeId: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('challenge_comments')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at')
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function insertComment(
  db: SupabaseClient,
  userId: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .from('challenge_comments')
    .insert({ user_id: userId, ...row })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function removeComment(db: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await db.from('challenge_comments').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
}
