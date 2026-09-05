import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { fetchChallengeComments, postChallengeCommentApi } from './challengeCommentsApi';
import { challengeCommentsKeys } from './challengeCommentsKeys';

/** One flat discussion thread per challenge. */
export type ChallengeComment = {
  id: string;
  challengeId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type CommentsByChallenge = Record<string, ChallengeComment[]>;

// Fetched once per (identity, challenge) — same scoped-fetch shape as every other resource here.
// No live push: a comment posted by someone else after this page's own fetch landed won't appear
// until a fresh load.
const fetchedFor = new Set<string>();

export const useChallengeComments = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = challengeCommentsKeys.map(userId);

  // Same "one shared cache entry, backed by React Query instead of useSessionStore" shape as
  // useTags.tsx's own list query — see its own comment for the reasoning.
  const { data: byChallengeId = {} } = useQuery<CommentsByChallenge>({
    queryKey,
    queryFn: () => queryClient.getQueryData<CommentsByChallenge>(queryKey) ?? {},
    enabled: false,
    staleTime: Infinity,
  });

  // Not quiet — posting is a click the user should see fail, not one that silently drops (see
  // postChallengeCommentApi's own comment). No optimistic write/rollback here for the same
  // reason: the comment only ever gets added to the cache once the real post has actually
  // succeeded, so there's nothing to roll back on failure — `mutateAsync` rejecting is exactly
  // what lets `postComment`'s own caller catch and show that failure, same as before.
  const postCommentMutation = useMutation<
    { comment: ChallengeComment },
    Error,
    { id: string; challengeId: string; body: string; displayName: string }
  >({
    mutationFn: args => postChallengeCommentApi(args),
    onSuccess: (result, { challengeId }) => {
      queryClient.setQueryData<CommentsByChallenge>(queryKey, prev => ({
        ...prev,
        [challengeId]: [...(prev?.[challengeId] || []), result.comment],
      }));
    },
  });

  const getComments = (challengeId: string | undefined) => {
    if (challengeId && ready) {
      const key = `${userId}:${challengeId}`;
      if (!fetchedFor.has(key)) {
        fetchedFor.add(key);
        fetchChallengeComments(challengeId).then(result => {
          if (!result) {
            fetchedFor.delete(key);
            return;
          }
          queryClient.setQueryData<CommentsByChallenge>(queryKey, prev => ({
            ...prev,
            [challengeId]: result.comments,
          }));
        });
      }
    }
    return (challengeId && byChallengeId[challengeId]) || [];
  };

  const postComment = async (challengeId: string, body: string, displayName: string) => {
    const result = await postCommentMutation.mutateAsync({ id: uniqueId(), challengeId, body, displayName });
    return result.comment;
  };

  return { getComments, postComment };
};
