// `POST /challenges { challenge }` — owner-only upsert, always enrolls the owner as a
// participant too — `challenge.ownerDisplayName`/`ownerAvatarUrl`, if given, become that
// participant row's name/photo (neither is a `challenges` column; omit either on a re-save that
// isn't touching it and the stored one is left alone). `challenge.fieldTargets` is
// `{ [fieldId]: target }`, keyed by the owner's own field ids. `challenge.theme` is one of
// CHALLENGE_THEMES (dto/challenges/challenges-dto.ts), falls back to 'classic' if omitted/invalid.
// `challenge.backgroundImageUrl` is a plain http(s) URL (an already-hosted photo, not an upload)
// shown behind the shared page instead of/over the theme's own background; anything that isn't a
// plausible http(s) URL clears it to null rather than failing the save.
//
// `compose(checkCanWriteChallenge, core)` — see services/challenges-access-service.ts's own
// comment for why the write-side check has to be explicit now.

import { compose } from '../../../shared/authorize.ts';
import { type SaveAuthorization, checkCanWriteChallenge } from '../services/challenges-access-service.ts';
import { saveChallenge } from '../services/challenges-service.ts';
import type { Ctx } from './challenges-context.ts';

export const saveChallengeHandler = compose(checkCanWriteChallenge, async (ctx: Ctx, { row, entry }: SaveAuthorization) => {
  const challenge = await saveChallenge(ctx, row, entry);
  return { challenge };
});
