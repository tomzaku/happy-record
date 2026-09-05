import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { fetchChallengeDashboard, fetchChallengeForTemplate, fetchMyChallenges, saveChallenge } from './challengesApi';
import { challengesKeys } from './challengesKeys';
export type { MyChallengeRow } from './challengesApi';

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
 * Turns a shared checklist template into something joinable. Every challenge shows the peer
 * completion grid (packages/global/src/store/challenge/useChallengeParticipants) to everyone who
 * joins; `commentsEnabled` separately gates the flat thread
 * (packages/global/src/store/challenge/useChallengeComments). At most one challenge per template
 * — `checklistTemplateId` is unique server-side.
 */
export type Challenge = {
  id: string;
  checklistTemplateId: string;
  ownerId: string;
  /** Always `true` now — every challenge shares everyone's check-ins, there's no private-roster
   * mode left. Kept on the wire (rather than dropped) so an older client reading it, or a legacy
   * row saved before this, doesn't need a shape change. */
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

type ChallengesMap = Record<string, Challenge>;
// Scoped to the one challenge being written, not a whole-map snapshot — see useTags.tsx's own
// comment (same fix, same resource shape) for why a global snapshot isn't safe under concurrent
// writes.
type RollbackContext = { previousChallenge: Challenge | undefined };

type SetChallengeOptionsArgs = {
  checklistTemplateId: string;
  options: {
    shareRecords: boolean;
    commentsEnabled: boolean;
    fieldTargets: Record<string, number>;
    theme: ChallengeThemeId;
    backgroundImageUrl: string | null;
    ownerDisplayName?: string;
    ownerAvatarUrl?: string;
  };
  optimistic: Challenge;
};

// Keyed by templateId (not "all mine") — CardShare and the shared page each
// only ever need the one challenge for the template they're already
// looking at. `userId` rides along in the key so a scope already fetched
// for one identity re-fetches once the signed-in identity actually changes.
const fetchedFor = new Set<string>();

export const useChallenge = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = challengesKeys.map(userId);

  // Same "one shared cache entry, backed by React Query instead of useSessionStore" shape as
  // useTags.tsx's own list query — see its own comment for the reasoning.
  const { data: challenges = {} } = useQuery<ChallengesMap>({
    queryKey,
    queryFn: () => queryClient.getQueryData<ChallengesMap>(queryKey) ?? {},
    enabled: false,
    staleTime: Infinity,
  });

  const saveChallengeMutation = useMutation<
    { challenge: Challenge } | null,
    Error,
    SetChallengeOptionsArgs,
    RollbackContext
  >({
    mutationFn: async ({ checklistTemplateId, options, optimistic }) => {
      const result = await saveChallenge({ id: optimistic.id, checklistTemplateId, ...options });
      if (!result) throw new Error('Failed to save challenge');
      return result;
    },
    onMutate: async ({ checklistTemplateId, optimistic }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousChallenge = queryClient.getQueryData<ChallengesMap>(queryKey)?.[checklistTemplateId];
      queryClient.setQueryData<ChallengesMap>(queryKey, prev => ({ ...prev, [checklistTemplateId]: optimistic }));
      return { previousChallenge };
    },
    onSuccess: (result, { checklistTemplateId }) => {
      if (result?.challenge) {
        queryClient.setQueryData<ChallengesMap>(queryKey, prev => ({ ...prev, [checklistTemplateId]: result.challenge }));
      }
    },
    onError: (_error, { checklistTemplateId }, context) => {
      queryClient.setQueryData<ChallengesMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        if (context?.previousChallenge) {
          next[checklistTemplateId] = context.previousChallenge;
        } else {
          delete next[checklistTemplateId];
        }
        return next;
      });
    },
  });

  const getChallengeForTemplate = (checklistTemplateId: string | undefined) => {
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
            queryClient.setQueryData<ChallengesMap>(queryKey, prev => ({ ...prev, [checklistTemplateId]: result.challenge! }));
          }
        });
      }
    }
    return checklistTemplateId ? challenges[checklistTemplateId] : undefined;
  };

  /** Owner-only (RLS-enforced); upserts on checklistTemplateId, so re-sharing reuses the same challenge. */
  const setChallengeOptions = async (
    checklistTemplateId: string,
    options: SetChallengeOptionsArgs['options'],
  ) => {
    const existing = challenges[checklistTemplateId];
    const optimistic: Challenge = {
      id: existing?.id ?? uniqueId(),
      checklistTemplateId,
      ownerId: userId ?? '',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shareRecords: options.shareRecords,
      commentsEnabled: options.commentsEnabled,
      fieldTargets: options.fieldTargets,
      theme: options.theme,
      backgroundImageUrl: options.backgroundImageUrl,
    };

    try {
      const result = await saveChallengeMutation.mutateAsync({ checklistTemplateId, options, optimistic });
      return result?.challenge ?? optimistic;
    } catch {
      // Already rolled back locally via saveChallengeMutation's own onError — quiet, same as
      // every other write in this app.
      return optimistic;
    }
  };

  return {
    getChallengeForTemplate,
    setChallengeOptions,
    // Imperative — the dashboard page wants the real data on load, not a
    // value that fills in over a later render, so this awaits the fetch and
    // returns it directly instead of reading back through the cache.
    getChallengeDashboard: fetchChallengeDashboard,
    // Same shape, same reasoning — challenge-list-page-ui is a dedicated page that wants its
    // whole roster fresh on load, not a value other components read reactively, so this is a
    // plain imperative fetch (like getChallengeDashboard above) rather than a cached "all mine"
    // query the way useChecklistTemplates.tsx's own bulk fetch is — nothing else in the app needs
    // this list outside that one page today.
    getMyChallenges: fetchMyChallenges,
  };
};
