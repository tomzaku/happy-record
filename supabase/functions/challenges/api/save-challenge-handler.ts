// `POST /challenges { challenge }` — owner-only upsert, always enrolls the owner as a
// participant too — `challenge.ownerDisplayName`/`ownerAvatarUrl`, if given, become that
// participant row's name/photo (neither is a `challenges` column; omit either on a re-save that
// isn't touching it and the stored one is left alone). `challenge.fieldTargets` is
// `{ [fieldId]: target }`, keyed by the owner's own field ids. `challenge.theme` is one of
// CHALLENGE_THEMES (model/challenges-model.ts), falls back to 'classic' if omitted/invalid.
// `challenge.backgroundImageUrl` is a plain http(s) URL (an already-hosted photo, not an upload)
// shown behind the shared page instead of/over the theme's own background; anything that isn't a
// plausible http(s) URL clears it to null rather than failing the save.
//
// `compose(checkCanWriteChallenge, core)` — see services/challenges-access-service.ts's own
// comment for why the write-side check has to be explicit now.

import { compose } from '../../../shared/authorize.ts';
import { toChallenge } from '../model/challenges-model.ts';
import { type SaveAuthorization, checkCanWriteChallenge } from '../services/challenges-access-service.ts';
import type { Ctx } from './challenges-context.ts';

export const saveChallengeHandler = compose(checkCanWriteChallenge, async ({ db, userId }: Ctx, { row, entry }: SaveAuthorization) => {
  // Not a `challenges` column — see `fromChallenge`, which only maps real
  // ones — this is the owner's own display name for the participant row
  // enrolled below. Optional: an older client (or a re-save that only
  // touched the theme/targets) just omits it, which must not blank out an
  // already-good name (see the conditional spread below).
  const ownerDisplayNameRaw = entry.ownerDisplayName;
  const ownerDisplayName =
    typeof ownerDisplayNameRaw === 'string' && ownerDisplayNameRaw.trim() ? ownerDisplayNameRaw.trim() : undefined;
  // Same idea, same "omit rather than blank out" handling — the owner's
  // Google profile photo (see useSession.ts's `avatarUrl`), absent for an
  // owner who was never signed in with Google.
  const ownerAvatarUrlRaw = entry.ownerAvatarUrl;
  const ownerAvatarUrl = typeof ownerAvatarUrlRaw === 'string' && ownerAvatarUrlRaw ? ownerAvatarUrlRaw : undefined;

  // Ownership enforced by checkCanWriteChallenge, not RLS anymore; unique on checklist_template_id
  // so re-sharing the same template reuses this row.
  const { data, error } = await db
    .from('challenges')
    .upsert({ owner_id: userId, ...row }, { onConflict: 'checklist_template_id' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const challenge = toChallenge(data as Record<string, unknown>);

  // The sharer always shows up on their own dashboard — every challenge
  // shares everyone's check-ins now, no private-roster mode left to gate
  // this on. Their own template *is* the challenge's canonical
  // checklist_template_id (the owner never forks their own template the way
  // a joiner does — see useJoinChallenge.tsx — so their participant row just
  // points at it directly). No `ignoreDuplicates` (unlike this used to be):
  // a re-save with a new `ownerDisplayName` — someone fixing a blank name
  // from before this field existed — has to actually reach an existing row,
  // not silently no-op against it. supabase-js's default upsert resolution
  // merges rather than clobbering the full row, so omitting `display_name`
  // below (no name given this time) leaves whatever was already stored
  // untouched.
  const { error: participantError } = await db.from('challenge_participants').upsert(
    {
      id: `${challenge.id}:${userId}`,
      challenge_id: challenge.id,
      user_id: userId,
      checklist_template_id: challenge.checklistTemplateId,
      ...(ownerDisplayName ? { display_name: ownerDisplayName } : {}),
      ...(ownerAvatarUrl ? { avatar_url: ownerAvatarUrl } : {}),
    },
    { onConflict: 'challenge_id,user_id' },
  );
  if (participantError) throw new Error(participantError.message);

  return { challenge };
});
