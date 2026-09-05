import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import {
  clearChallengeReactionApi,
  fetchReactionSummaries,
  setChallengeReactionApi,
  type ChallengeReactionSummary,
  type ChallengeReactionType,
} from './challengeReactionsApi';
import { challengeReactionsKeys } from './challengeReactionsKeys';
export type { ChallengeReactionSummary, ChallengeReactionType } from './challengeReactionsApi';

type ReactionsMap = Record<string, ChallengeReactionSummary>;
// Scoped to the one challenge being reacted to, not a whole-map snapshot — same reasoning
// useChallenge.tsx's own SaveChallenge mutation (and useTags.tsx before it) already documents for
// this exact pitfall under concurrent writes.
type RollbackContext = { previous: ChallengeReactionSummary | undefined };

const EMPTY_SUMMARY: ChallengeReactionSummary = { likes: 0, dislikes: 0, myReaction: null };

/**
 * Like/dislike counts + the caller's own reaction, for the "Discover" browse cards
 * (challenge-list-page-ui). One shared cache entry per identity (`useQuery`-backed, same shape
 * `useChallenge.tsx`'s own map already uses) — `loadReactionSummaries` is a plain batch fetch a
 * page calls once for its whole visible list, not a per-card query.
 */
export const useChallengeReactions = () => {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = challengeReactionsKeys.map(userId);

  const { data: reactions = {} } = useQuery<ReactionsMap>({
    queryKey,
    queryFn: () => queryClient.getQueryData<ReactionsMap>(queryKey) ?? {},
    enabled: false,
    staleTime: Infinity,
  });

  const applyReaction = (challengeId: string, next: ChallengeReactionSummary | undefined) => {
    queryClient.setQueryData<ReactionsMap>(queryKey, prev => {
      const map = { ...prev };
      if (next) map[challengeId] = next;
      else delete map[challengeId];
      return map;
    });
  };

  /** Merges into the shared map rather than replacing it, so a summary already fetched (or just
   * optimistically updated) for a challenge outside this particular batch isn't clobbered. */
  const loadReactionSummaries = async (challengeIds: string[]) => {
    const result = await fetchReactionSummaries(challengeIds);
    if (!result) return;
    queryClient.setQueryData<ReactionsMap>(queryKey, prev => ({ ...prev, ...result.reactions }));
  };

  const reactionMutation = useMutation<
    unknown,
    Error,
    { challengeId: string; reaction: ChallengeReactionType | null },
    RollbackContext
  >({
    mutationFn: ({ challengeId, reaction }) =>
      reaction ? setChallengeReactionApi(challengeId, reaction) : clearChallengeReactionApi(challengeId),
    onMutate: async ({ challengeId, reaction }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ReactionsMap>(queryKey)?.[challengeId];
      const base = previous ?? EMPTY_SUMMARY;
      const likes = base.likes - (base.myReaction === 'like' ? 1 : 0) + (reaction === 'like' ? 1 : 0);
      const dislikes = base.dislikes - (base.myReaction === 'dislike' ? 1 : 0) + (reaction === 'dislike' ? 1 : 0);
      applyReaction(challengeId, { likes, dislikes, myReaction: reaction });
      return { previous };
    },
    onError: (_error, { challengeId }, context) => applyReaction(challengeId, context?.previous),
  });

  /** Clicking the same reaction again clears it — the single-toggleable-reaction decision (like
   * YouTube: like, dislike, or none, never both). */
  const setMyReaction = (challengeId: string, reaction: ChallengeReactionType) => {
    const current = reactions[challengeId]?.myReaction ?? null;
    reactionMutation.mutate({ challengeId, reaction: current === reaction ? null : reaction });
  };

  const clearMyReaction = (challengeId: string) => reactionMutation.mutate({ challengeId, reaction: null });

  return { reactions, loadReactionSummaries, setMyReaction, clearMyReaction };
};
