// Plain data access for `challenges` — no authorization decisions here, just reads
// `challenges-access-service.ts` builds on. See `notes/repository/notes-repository.ts` for the
// reference shape.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function fetchChallengeById(db: SupabaseClient, id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db.from('challenges').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) ?? null;
}

export async function fetchTemplateVisibility(
  db: SupabaseClient,
  templateId: string,
): Promise<{ visibility: string } | null> {
  const { data, error } = await db
    .from('checklist_templates')
    .select('visibility')
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

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

/** For the write-side ownership check — is there already a challenge for this template, and if
 * so who owns it. */
export async function fetchChallengeOwnerByTemplateId(
  db: SupabaseClient,
  checklistTemplateId: string,
): Promise<{ owner_id: string } | null> {
  const { data, error } = await db
    .from('challenges')
    .select('owner_id')
    .eq('checklist_template_id', checklistTemplateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
