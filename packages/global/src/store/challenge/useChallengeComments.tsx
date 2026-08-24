import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { fetchChallengeComments, postChallengeCommentApi } from './challengeCommentsApi';

const CHALLENGE_COMMENTS_KEY = 'challenge_comments';

/** One flat discussion thread per challenge — see CLAUDE.md. */
export type ChallengeComment = {
  id: string;
  challengeId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

// Fetched once per (identity, challenge) — same scoped-fetch shape as every
// other resource here. No live push: a comment posted by someone else after
// this page's own fetch landed won't appear until a fresh load, same
// limitation CLAUDE.md documents for the rest of the app.
const fetchedFor = new Set<string>();

export const useChallengeComments = () => {
  const [byChallengeId, setByChallengeId] = useSessionStore<Record<string, ChallengeComment[]>>(
    CHALLENGE_COMMENTS_KEY,
    {},
  );
  const { userId, ready } = useSession();

  const getComments = React.useCallback(
    (challengeId: string | undefined) => {
      if (challengeId && ready) {
        const key = `${userId}:${challengeId}`;
        if (!fetchedFor.has(key)) {
          fetchedFor.add(key);
          fetchChallengeComments(challengeId).then(result => {
            if (!result) {
              fetchedFor.delete(key);
              return;
            }
            setByChallengeId(prev => ({ ...prev, [challengeId]: result.comments }));
          });
        }
      }
      return (challengeId && byChallengeId[challengeId]) || [];
    },
    [byChallengeId, userId, ready, setByChallengeId],
  );

  /** Not quiet — posting is a click the user should see fail, not one that silently drops. */
  const postComment = async (challengeId: string, body: string, displayName: string) => {
    const comment = await postChallengeCommentApi({ id: uniqueId(), challengeId, body, displayName });
    setByChallengeId(prev => ({
      ...prev,
      [challengeId]: [...(prev[challengeId] || []), comment.comment],
    }));
    return comment.comment;
  };

  return { getComments, postComment };
};
