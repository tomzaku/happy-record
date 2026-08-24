import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { uniqueId } from '../../util';
import { fetchChallengeDashboard, fetchChallengeForTemplate, saveChallenge } from './challengesApi';

const CHALLENGE_KEY = 'challenge';

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
  createdAt: string;
  updatedAt: string;
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
    options: { shareRecords: boolean; commentsEnabled: boolean },
  ) => {
    const existing = challenges[checklistTemplateId];
    const optimistic: Challenge = {
      id: existing?.id ?? uniqueId(),
      checklistTemplateId,
      ownerId: userId ?? '',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...options,
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
  };
};
