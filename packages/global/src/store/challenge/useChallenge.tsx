import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { fetchChallengeDashboard, fetchChallengeForTemplate, fetchMyChallenges, saveChallenge } from './challengesApi';
export type { MyChallengeRow } from './challengesApi';

const CHALLENGE_KEY = 'challenge';

/**
 * The 3 fixed visual directions the shared "take the challenge" page
 * (checklist-template-shared-page-ui) can render as — see the theme.ts
 * module in that package for what each one actually looks like. Mirrors
 * CHALLENGE_THEMES in supabase/functions/_shared/challenges.ts; the DB's
 * own CHECK constraint (20260825010000_challenge_theme.sql) is the real
 * guard, this is just so the client isn't typing it as a bare `string`.
 */
export const CHALLENGE_THEMES = ['classic', 'ignite', 'playful'] as const;
export type ChallengeThemeId = (typeof CHALLENGE_THEMES)[number];

/**
 * Turns a shared checklist template into something joinable — see
 * CLAUDE.md's "Challenges" section. `shareRecords` gates the peer
 * completion grid (packages/global/src/store/challenge/useChallengeParticipants);
 * `commentsEnabled` gates the flat thread
 * (packages/global/src/store/challenge/useChallengeComments). At most one
 * challenge per template — `checklistTemplateId` is unique server-side.
 */
export type Challenge = {
  id: string;
  checklistTemplateId: string;
  ownerId: string;
  shareRecords: boolean;
  commentsEnabled: boolean;
  /**
   * A shared, collective goal per number field — `{ [fieldId]: target }`,
   * keyed by the owner's own field id (never a participant's forked copy —
   * see useJoinChallenge.tsx and the challenge_targets migration). Owner-only
   * to set, "before or after share" (CardShare). Text fields are out of
   * scope on purpose — no sensible numeric goal for one; the streak
   * grid/ranking already covers "did they contribute" for those.
   */
  fieldTargets: Record<string, number>;
  /** Owner-picked in CardShare; applied by the shared page for every visitor, not just participants. */
  theme: ChallengeThemeId;
  /**
   * Owner-set in CardShare, a plain http(s) URL (not an upload — this app
   * has no file-storage pipeline) shown behind the shared page in place of
   * the theme's own background. `null` for every challenge that hasn't set
   * one — see 20260828000000_challenge_background_image.sql.
   */
  backgroundImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Not a `challenges` column — the owner's own `challenge_participants`
   * name/photo, straight from their Google identity (see useSession.ts's
   * `displayName`/`avatarUrl` and CardShare), only present when
   * `GET /challenges?checklistTemplateId=` finds one (RLS-gated to a
   * publicly shared challenge — see
   * 20260828010000_challenge_owner_name_public.sql). Used by the shared
   * page's greeting in place of a generic "Someone".
   */
  ownerDisplayName?: string;
  ownerAvatarUrl?: string;
};

// Keyed by templateId (not "all mine") — CardShare and the shared page each
// only ever need the one challenge for the template they're already
// looking at. `userId` rides along in the key so a scope already fetched
// for one identity re-fetches once the signed-in identity actually changes.
const fetchedFor = new Set<string>();

export const useChallenge = () => {
  const [challenges, setChallenges] = useSessionStore<Record<string, Challenge>>(CHALLENGE_KEY, {});
  const { userId, ready } = useSession();

  const getChallengeForTemplate = React.useCallback(
    (checklistTemplateId: string | undefined) => {
      if (checklistTemplateId && ready) {
        const key = `${userId}:${checklistTemplateId}`;
        if (!fetchedFor.has(key)) {
          fetchedFor.add(key);
          fetchChallengeForTemplate(checklistTemplateId).then(result => {
            if (!result) {
              fetchedFor.delete(key);
              return;
            }
            if (result.challenge) {
              setChallenges(prev => ({ ...prev, [checklistTemplateId]: result.challenge! }));
            }
          });
        }
      }
      return checklistTemplateId ? challenges[checklistTemplateId] : undefined;
    },
    [challenges, userId, ready, setChallenges],
  );

  /** Owner-only (RLS-enforced); upserts on checklistTemplateId, so re-sharing reuses the same challenge. */
  const setChallengeOptions = async (
    checklistTemplateId: string,
    options: {
      shareRecords: boolean;
      commentsEnabled: boolean;
      fieldTargets: Record<string, number>;
      theme: ChallengeThemeId;
      backgroundImageUrl: string | null;
      /** The owner's own name/photo on the group dashboard — see saveChallenge. */
      ownerDisplayName?: string;
      ownerAvatarUrl?: string;
    },
  ) => {
    // Not Challenge fields (they're the owner's participant row, not this
    // one) — kept out of `optimistic` for that reason, passed to
    // saveChallenge separately below.
    const { ownerDisplayName, ownerAvatarUrl, ...challengeFields } = options;
    const existing = challenges[checklistTemplateId];
    const optimistic: Challenge = {
      id: existing?.id ?? uniqueId(),
      checklistTemplateId,
      ownerId: userId ?? '',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...challengeFields,
    };
    setChallenges(prev => ({ ...prev, [checklistTemplateId]: optimistic }));

    const result = await saveChallenge({ id: optimistic.id, checklistTemplateId, ...options });
    if (result?.challenge) {
      setChallenges(prev => ({ ...prev, [checklistTemplateId]: result.challenge }));
      return result.challenge;
    }
    return optimistic;
  };

  return {
    getChallengeForTemplate,
    setChallengeOptions,
    // Imperative — the dashboard page wants the real data on load, not a
    // value that fills in over a later render (CLAUDE.md's "one-shot action
    // handler" rule), so this awaits the fetch and returns it directly
    // instead of reading back through the store.
    getChallengeDashboard: fetchChallengeDashboard,
    // Same shape, same reasoning — challenge-list-page-ui is a dedicated page that wants its
    // whole roster fresh on load, not a value other components read reactively, so this is a
    // plain imperative fetch (like getChallengeDashboard above) rather than a useSessionStore-
    // backed "all mine" store the way useChecklistTemplates.tsx's ensureAllTemplatesFetched is —
    // nothing else in the app needs this list outside that one page today.
    getMyChallenges: fetchMyChallenges,
  };
};
