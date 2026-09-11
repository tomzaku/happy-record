import React from 'react';
import { useChallenge, type RecordDetailHistoryEntry } from '@dreamer/global';

export type { RecordDetailHistoryEntry };

/**
 * RecordDetailCard's own "By Member" tab — a genuinely on-demand fetch (see
 * challengesApi.ts's own fetchChallengeRecordDetailHistory comment for why this isn't part of the
 * main dashboard payload), so unlike every other resource in this app there's no "have I already
 * fetched this scope" cache here: it's a plain effect keyed on which member is selected, refiring
 * on every switch. Fine for a click-driven side panel nobody flips through rapidly the way a list
 * scrolls.
 */
export const useRecordDetailHistory = (challengeId: string | undefined, memberUserId: string | undefined) => {
  const { getRecordDetailHistory } = useChallenge();
  const [entries, setEntries] = React.useState<RecordDetailHistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!challengeId || !memberUserId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getRecordDetailHistory(challengeId, memberUserId).then(result => {
      if (cancelled) return;
      setEntries(result?.recordDetailHistory ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, memberUserId]);

  return { entries, loading };
};
