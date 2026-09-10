import React from 'react';
import { useChallenge, MyChallengeRow } from '@dreamer/global';

/**
 * The home page's own "which challenges can I check in on" list — every challenge the caller
 * owns or joined (useChallenge's own getMyChallenges, the same one-shot fetch challenge-list-page-ui
 * uses for "My Challenges"). Deliberately not narrowed to whatever's scheduled today: a challenge
 * still due later this week, or one whose schedule already passed today, should still be quick to
 * check in on from here — each ChallengeQuickSubmitCard's own submit form already works for any
 * day (see its `ignoreDayFilter: true` on useTaskDetailModalData), so there's nothing this list
 * needs to gate on.
 */
export const useChallengeQuickSubmitList = (): MyChallengeRow[] => {
  const { getMyChallenges } = useChallenge();

  const [challenges, setChallenges] = React.useState<MyChallengeRow[] | null>(null);
  React.useEffect(() => {
    getMyChallenges()
      .then(result => setChallenges(result.challenges))
      .catch(() => setChallenges([]));
  }, [getMyChallenges]);

  return challenges ?? [];
};
