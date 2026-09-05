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

export async function fetchChallengeByTemplateId(db: SupabaseClient, templateId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await db.from('challenges').select('*').eq('checklist_template_id', templateId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) ?? null;
}

export async function fetchParticipantDisplay(
  db: SupabaseClient,
  challengeId: string,
  userId: string,
): Promise<{ display_name: string | null; avatar_url: string | null } | null> {
  const { data } = await db
    .from('challenge_participants')
    .select('display_name, avatar_url')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function fetchOwnedChallenges(db: SupabaseClient, userId: string, limit: number): Promise<Record<string, unknown>[]> {
  const { data, error } = await db.from('challenges').select('*').eq('owner_id', userId).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function fetchMyParticipantRows(
  db: SupabaseClient,
  userId: string,
  limit: number,
): Promise<{ challenge_id: string; joined_at: string }[]> {
  const { data, error } = await db
    .from('challenge_participants')
    .select('challenge_id, joined_at')
    .eq('user_id', userId)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as { challenge_id: string; joined_at: string }[];
}

export async function fetchChallengesByIds(db: SupabaseClient, ids: string[], limit: number): Promise<Record<string, unknown>[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('challenges').select('*').in('id', ids).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

/** Admin-curated only (see 20260905010000_challenges_public_listing.sql) — `excludeIds` drops
 * whatever the caller already owns or has joined, so "Discover" never duplicates "My Challenges". */
export async function fetchPublicChallenges(
  db: SupabaseClient,
  excludeIds: string[],
  limit: number,
): Promise<Record<string, unknown>[]> {
  let query = db.from('challenges').select('*').eq('is_public_listing', true);
  if (excludeIds.length) query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function fetchTemplateVisibilities(db: SupabaseClient, ids: string[]): Promise<{ id: string; visibility: string }[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('checklist_templates').select('id, visibility').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; visibility: string }[];
}

export async function fetchTemplatesMeta(db: SupabaseClient, ids: string[]): Promise<Record<string, unknown>[]> {
  if (!ids.length) return [];
  const { data, error } = await db.from('checklist_templates').select('id, title, avatar').in('id', ids);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}

export async function fetchParticipantChallengeIds(
  db: SupabaseClient,
  challengeIds: string[],
  limit: number,
): Promise<{ challenge_id: string }[]> {
  if (!challengeIds.length) return [];
  const { data, error } = await db
    .from('challenge_participants')
    .select('challenge_id')
    .in('challenge_id', challengeIds)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as { challenge_id: string }[];
}

export type ChecklistRangeRow = { id: string; user_id: string; checklist_template_id: string; started_at: string; completed_at: string | null };

export async function fetchChecklistsForUsersInRange(
  db: SupabaseClient,
  userIds: string[],
  templateIds: string[],
  from: string,
  to: string,
  limit: number,
): Promise<ChecklistRangeRow[]> {
  if (!templateIds.length || !userIds.length) return [];
  const { data, error } = await db
    .from('checklists')
    .select('id, user_id, checklist_template_id, started_at, completed_at')
    .in('checklist_template_id', templateIds)
    .in('user_id', userIds)
    .gte('started_at', from)
    .lte('started_at', to)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ChecklistRangeRow[];
}

export type SubmissionRangeRow = { user_id: string; checklist_id: string; checklist_template_id: string; created_at: string };

export async function fetchSubmissionsForUsersInRange(
  db: SupabaseClient,
  userIds: string[],
  templateIds: string[],
  from: string,
  to: string,
  limit: number,
): Promise<SubmissionRangeRow[]> {
  if (!templateIds.length || !userIds.length) return [];
  const { data, error } = await db
    .from('submissions')
    .select('user_id, checklist_id, checklist_template_id, created_at')
    .in('checklist_template_id', templateIds)
    .in('user_id', userIds)
    .gte('created_at', from)
    .lte('created_at', to)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SubmissionRangeRow[];
}

export async function fetchParticipantsForChallenge(
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

export type FieldMetaRow = { id: string; title: string; unit: string | null; icon: string | null };

export async function fetchFieldsMetaForUser(db: SupabaseClient, fieldIds: string[], userId: string): Promise<FieldMetaRow[]> {
  if (!fieldIds.length) return [];
  const { data, error } = await db
    .from('fields')
    .select('id, title, unit, icon')
    .in('id', fieldIds)
    .or(`user_id.eq.${userId},visibility.eq.public`);
  if (error) throw new Error(error.message);
  return (data ?? []) as FieldMetaRow[];
}

export async function fetchForkedFields(
  db: SupabaseClient,
  visibleUserIds: string[],
  targetFieldIds: string[],
): Promise<{ id: string; copied_from_id: string }[]> {
  if (!visibleUserIds.length || !targetFieldIds.length) return [];
  const { data, error } = await db
    .from('fields')
    .select('id, copied_from_id')
    .in('user_id', visibleUserIds)
    .in('copied_from_id', targetFieldIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; copied_from_id: string }[];
}

export async function fetchChecklistRecordTotals(
  db: SupabaseClient,
  fieldIds: string[],
  visibleUserIds: string[],
  limit: number,
): Promise<{ field_id: string; user_id: string; value_number: number | null }[]> {
  if (!fieldIds.length || !visibleUserIds.length) return [];
  const { data, error } = await db
    .from('checklist_records')
    .select('field_id, user_id, value_number')
    .in('field_id', fieldIds)
    .in('user_id', visibleUserIds)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as { field_id: string; user_id: string; value_number: number | null }[];
}

export type FieldTypeRow = { id: string; type: string };

/** Just the type, for `getAttachments`' own "which of this template's fields are photo/video"
 * filter — no visibility scoping needed the way `fetchFieldsMetaForUser` has, since a bare type
 * string isn't sensitive the way a title could be, and every id passed in already came from a
 * template this caller can already see. */
export async function fetchFieldTypesByIds(db: SupabaseClient, fieldIds: string[]): Promise<FieldTypeRow[]> {
  if (!fieldIds.length) return [];
  const { data, error } = await db.from('fields').select('id, type').in('id', fieldIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as FieldTypeRow[];
}

export type MediaRecordRow = { user_id: string; field_id: string; value_text: string | null; created_at: string };

/** A photo/video field's own submitted value (a `media` row's own id, held in `value_text`) —
 * the dashboard's own peer-read carve-out for attachments, narrowly scoped to fields already known
 * to be `type: 'photo'/'video'` and to `visibleUserIds` (the same share_records-gated list every
 * other peer read on this dashboard uses). The media blob itself still goes through its own
 * separate authorization (`media/services/media-access-service.ts`'s `checkCanReadMedia`) when the
 * client actually resolves one of these ids into a URL — this only ever hands back the id. */
export async function fetchMediaChecklistRecordsForUsersInRange(
  db: SupabaseClient,
  fieldIds: string[],
  visibleUserIds: string[],
  from: string,
  to: string,
  limit: number,
): Promise<MediaRecordRow[]> {
  if (!fieldIds.length || !visibleUserIds.length) return [];
  // No `.not('value_text', 'is', null)` filter here — `getAttachments` (the only caller) already
  // filters out a falsy `value_text` itself, and every field id passed in is already known to be
  // `photo`/`video`-typed, so a null here only ever means "not filled in this range," never a
  // different field type's row leaking through.
  const { data, error } = await db
    .from('checklist_records')
    .select('user_id, field_id, value_text, created_at')
    .in('field_id', fieldIds)
    .in('user_id', visibleUserIds)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as MediaRecordRow[];
}

export async function upsertChallenge(
  db: SupabaseClient,
  ownerId: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await db
    .from('challenges')
    .upsert({ owner_id: ownerId, ...row }, { onConflict: 'checklist_template_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function upsertOwnerParticipant(
  db: SupabaseClient,
  participant: {
    id: string;
    challengeId: string;
    userId: string;
    checklistTemplateId: string;
    displayName?: string;
    avatarUrl?: string;
  },
): Promise<void> {
  const { error } = await db.from('challenge_participants').upsert(
    {
      id: participant.id,
      challenge_id: participant.challengeId,
      user_id: participant.userId,
      checklist_template_id: participant.checklistTemplateId,
      ...(participant.displayName ? { display_name: participant.displayName } : {}),
      ...(participant.avatarUrl ? { avatar_url: participant.avatarUrl } : {}),
    },
    { onConflict: 'challenge_id,user_id' },
  );
  if (error) throw new Error(error.message);
}
