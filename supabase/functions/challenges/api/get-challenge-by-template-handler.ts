// `GET /challenges ?checklistTemplateId=` — owner's or a public template's, `null` if none yet.
// `challenge.ownerDisplayName`/`ownerAvatarUrl` ride along when the owner has them saved (see
// 20260828010000_challenge_owner_name_public.sql) — the shared page's greeting uses them in
// place of a generic fallback.

import { toChallenge } from '../model/challenges-model.ts';
import type { Ctx } from './challenges-context.ts';

/** The challenge is visible to its owner unconditionally, or to anyone at all once the template
 * is public (same rule the dashboard's checkCanReadDashboard uses for its own challenge-row
 * tier) — `null` for neither, not a thrown error, matching this route's established "no
 * challenge yet" contract. */
export async function getChallengeByTemplateHandler({ db, userId, url }: Ctx) {
  const templateId = url.searchParams.get('checklistTemplateId')!;
  const { data, error } = await db
    .from('challenges')
    .select('*')
    .eq('checklist_template_id', templateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { challenge: null };
  const row = data as Record<string, unknown>;
  const isOwner = row.owner_id === userId;

  if (!isOwner) {
    const { data: template, error: templateError } = await db
      .from('checklist_templates')
      .select('visibility')
      .eq('id', templateId)
      .maybeSingle();
    if (templateError) throw new Error(templateError.message);
    if (template?.visibility !== 'public') return { challenge: null };
  }

  const challenge = toChallenge(row);

  // The shared page's own greeting ("X just challenged you!") wants the real creator's
  // name/photo instead of a generic fallback — the owner's own `challenge_participants` row,
  // straight off their Google identity (see CardShare and useSession.ts's
  // `displayName`/`avatarUrl`). Always safe to read here: either the caller *is* the owner (their
  // own row), or we've just confirmed the template is public — exactly the two conditions the old
  // "Anyone can read the owner's name on a publicly shared challenge" RLS policy checked for,
  // combined with the base "read your own row" grant every participant already had.
  const { data: ownerRow } = await db
    .from('challenge_participants')
    .select('display_name, avatar_url')
    .eq('challenge_id', challenge.id)
    .eq('user_id', challenge.ownerId)
    .maybeSingle();
  const ownerDisplayName = (ownerRow?.display_name as string | undefined)?.trim();
  const ownerAvatarUrl = (ownerRow?.avatar_url as string | undefined) || undefined;

  return {
    challenge: {
      ...challenge,
      ...(ownerDisplayName ? { ownerDisplayName } : {}),
      ...(ownerAvatarUrl ? { ownerAvatarUrl } : {}),
    },
  };
}
