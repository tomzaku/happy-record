// Client for the `challenges` resource. See CLAUDE.md — nothing else should
// touch that table.

import { request } from '../../lib/api';
import type { Challenge } from './useChallenge';
import type { ChallengeParticipant } from './useChallengeParticipants';

export function fetchChallengeForTemplate(checklistTemplateId: string): Promise<{ challenge: Challenge | null } | null> {
  return request.get('/challenges', { quiet: true, params: { checklistTemplateId } });
}

/**
 * The dashboard read — a one-shot imperative fetch (the page wants the real
 * data on load, not a value that fills in over a later render), so it's not
 * marked quiet: the caller needs to know a fetch actually failed.
 */
export function fetchChallengeDashboard(
  id: string,
  from?: string,
  to?: string,
): Promise<{
  challenge: Challenge | null;
  participants: ChallengeParticipant[];
  completions: { userId: string; date: string }[];
  ranking: { userId: string; count: number }[];
  targets: {
    fieldId: string;
    title: string;
    unit: string;
    target: number;
    contributions: { userId: string; total: number }[];
  }[];
}> {
  return request.get('/challenges', { params: { id, from, to } });
}

export function saveChallenge(challenge: {
  id: string;
  checklistTemplateId: string;
  shareRecords: boolean;
  commentsEnabled: boolean;
  fieldTargets: Record<string, number>;
}): Promise<{ challenge: Challenge } | null> {
  return request.post('/challenges', { challenge }, { quiet: true });
}
