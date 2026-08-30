// Plain data access for `challenge-comments` — no authorization decisions here, just reads
// `challenge-comments-access-service.ts` builds on. See `notes/services/notes-repository.ts`
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
