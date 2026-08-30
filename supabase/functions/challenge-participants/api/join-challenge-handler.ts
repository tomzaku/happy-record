// `POST /challenge-participants { participant }` — join (upsert on challengeId+caller).
// Inherently self-scoped: `user_id` is always the caller's own regardless of what's in the body,
// so there's nothing to compose a `checkPermission` around.

import { ApiError } from '../../../shared/cors.ts';
import { fromChallengeParticipant, toChallengeParticipant } from '../../../dto/challenge-participants/challenge-participants-dto.ts';
import { joinChallenge } from '../services/challenge-participants-service.ts';
import { body, type Ctx } from './challenge-participants-context.ts';

export async function joinChallengeHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).participant;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing participant.');

  let row: ReturnType<typeof fromChallengeParticipant>;
  try {
    row = fromChallengeParticipant(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid participant.');
  }

  // No `checkPermission` here on purpose, same as before this moved off RLS: `user_id` is always
  // the caller's own (set by the repository, ignoring anything the body sent), so joining a
  // `challengeId` this caller can't otherwise read isn't a privilege escalation — it just never
  // resolves again on any of their own later reads (`challenges`'s own visibility rule,
  // `checklist-templates`'s).
  const data = await joinChallenge(ctx, row);
  return { participant: toChallengeParticipant(data) };
}
