// Plain data access for `challenge-participants` — no authorization decisions here, just reads
// `challenge-participants-access-service.ts` builds on. See `notes/repository/notes-repository.ts`
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

export async function fetchTemplateOwnerId(db: SupabaseClient, checklistTemplateId: string): Promise<string | null> {
  const { data, error } = await db
    .from('checklist_templates')
    .select('user_id')
    .eq('id', checklistTemplateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.user_id as string | undefined) ?? null;
}

export async function fetchRoster(
  db: SupabaseClient,
  challengeId: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const { data, error } = await db
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('joined_at')
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function upsertParticipant(
  db: SupabaseClient,
  userId: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .from('challenge_participants')
    .upsert({ user_id: userId, ...row }, { onConflict: 'challenge_id,user_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function removeParticipant(db: SupabaseClient, userId: string, challengeId: string): Promise<void> {
  const { error } = await db.from('challenge_participants').delete().eq('user_id', userId).eq('challenge_id', challengeId);
  if (error) throw new Error(error.message);
}
