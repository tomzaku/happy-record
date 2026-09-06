import React from 'react';
import { ChallengeParticipant, useChallengeComments } from '@dreamer/global';

/** Comment list + posting form state for one challenge's Comments card. */
export const useChallengeCommentForm = (id: string | undefined, commentsEnabled: boolean, me: ChallengeParticipant | undefined) => {
  const { getComments, postComment } = useChallengeComments();
  const [commentBody, setCommentBody] = React.useState('');
  const [commentName, setCommentName] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  // `@moon-ui/input`'s Input only ever reads its `value` prop once, at
  // mount (`useState(value ?? '')`) — it never syncs to that prop changing
  // later, so `setCommentBody('')` below updates the *state* but not what's
  // actually still sitting in the rendered `<input>`. Bumping this and
  // keying the Input on it forces a real remount, which is the only way to
  // reset it from outside without changing the shared component itself
  // (used all over the app; not a change to make just for this one screen).
  const [messageInputResetKey, setMessageInputResetKey] = React.useState(0);

  const comments = getComments(commentsEnabled ? id : undefined);

  // Joining (or owning a shared challenge) already required a real login and
  // captured a display name then — see useJoinChallenge.tsx. Reuse it
  // directly for comments instead of asking the same person to type their
  // name again every visit; only someone with no participant row at all
  // (the owner of a challenge that isn't sharing records) still gets the
  // free-text fallback below.
  const knownName = me?.displayName.trim();
  const authorName = knownName || commentName.trim();

  const handlePostComment = async () => {
    if (!id || !commentBody.trim() || !authorName || posting) return;
    setPosting(true);
    try {
      await postComment(id, commentBody.trim(), authorName);
      setCommentBody('');
      setMessageInputResetKey(k => k + 1);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setPosting(false);
    }
  };

  return {
    comments,
    commentBody,
    setCommentBody,
    commentName,
    setCommentName,
    posting,
    messageInputResetKey,
    knownName,
    authorName,
    handlePostComment,
  };
};
