// Client for the `challenges` resource. See CLAUDE.md — nothing else should
// touch that table.

import { request } from '../../lib/api';
import type { Challenge } from './useChallenge';
import type { ChallengeParticipant } from './useChallengeParticipants';

export function fetchChallengeForTemplate(checklistTemplateId: string): Promise<{ challenge: Challenge | null } | null> {
  return request.get('/challenges', { quiet: true, params: { checklistTemplateId } });
}

/** One row of the "My Challenges" listing — see the edge function's own module doc comment for
 * what each field means, `myCheckins`/`myStreak` especially (the caller's own effort on this
 * challenge, over the last 30 days). */
export type MyChallengeRow = {
  id: string;
  checklistTemplateId: string;
  title: string;
  avatar: { type: string; name: string; color?: string };
  isOwner: boolean;
  shareRecords: boolean;
  commentsEnabled: boolean;
  backgroundImageUrl: string | null;
  pageBackgroundImageUrl: string | null;
  participantCount: number;
  /** Up to 4 participants, earliest-joined first (owner included) — a preview sample for a
   * stacked-avatar row, not the full roster. Use `participantCount` for the real total. */
  participants: { userId: string; displayName: string; avatarUrl?: string }[];
  /** This challenge's own shared goals, each already carrying the caller's own total toward it
   * (`myTotal`) — see challenges-service.ts's myTargetSummaries. Empty when the challenge defines
   * no targets. */
  targets: { id: string; title: string; unit: string; icon: string; goal: number; myTotal: number }[];
  myCheckins: number;
  myStreak: number;
  createdAt: string;
  joinedAt?: string;
};

/**
 * Every challenge the caller owns or has joined, each with the caller's own effort on it — same
 * "not quiet" reasoning as fetchChallengeDashboard below: challenge-list-page-ui wants the real
 * data on load, not a value that's fine to start empty, so a real failure needs to reach the page
 * as a real failure rather than resolving to an indistinguishable empty list.
 */
export function fetchMyChallenges(): Promise<{ challenges: MyChallengeRow[] }> {
  return request.get('/challenges');
}

/** One row of the admin-curated "Discover" listing — no per-user checkins/streak the way
 * `MyChallengeRow` has (meaningless before joining), just enough to render a browse card. */
export type PublicChallengeRow = {
  id: string;
  checklistTemplateId: string;
  title: string;
  avatar: { type: string; name: string; color?: string };
  participantCount: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
};

/**
 * Admin-curated challenges (`Challenge.isPublicListing`, only ever set by hand) the caller hasn't
 * already owned/joined — see the edge function's own `listPublicChallenges` doc comment. Same
 * "not quiet" reasoning as `fetchMyChallenges` above.
 */
export function fetchPublicChallenges(): Promise<{ challenges: PublicChallengeRow[] }> {
  return request.get('/challenges', { params: { listing: 'public' } });
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
    id: string;
    title: string;
    unit: string;
    /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
    icon: string;
    goal: number;
    contributions: { userId: string; total: number }[];
    chartType: 'bar' | 'line' | 'area';
  }[];
  /** The dashboard's own "Record Detail" section — a plain per-field contribution total, no goal
   * the way `targets` has one. One entry per `Challenge.recordDetailFieldIds`. */
  recordDetails: {
    fieldId: string;
    title: string;
    /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
    icon: string;
    unit: string;
    contributions: { userId: string; total: number }[];
  }[];
  /**
   * Which photo/video field(s) each visible participant submitted, in this same date window —
   * `mediaId` is a `media` row's own id, never a URL (see `useMediaUrl`
   * packages/global/src/store/media/useMediaUrl.ts, the only place a component should resolve one
   * into an actual playable URL). Cross-reference `userId` against `participants` above for a
   * name/avatar to show next to it.
   */
  attachments: {
    userId: string;
    fieldId: string;
    title: string;
    /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
    icon: string;
    kind: 'photo' | 'video';
    mediaId: string;
    createdAt: string;
  }[];
}> {
  return request.get(`/challenges/${encodeURIComponent(id)}`, { params: { from, to } });
}

/** One member's own itemized "Record Detail" submissions in range — every field written together
 * (same Submit click) grouped into one entry, newest first. */
export type RecordDetailHistoryEntry = {
  submissionId: string;
  createdAt: string;
  values: {
    fieldId: string;
    title: string;
    /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
    icon: string;
    unit: string;
    value: number;
  }[];
};

/**
 * A separate, on-demand read from `fetchChallengeDashboard` above — same route, a `recordDetailUserId`
 * query param that switches it to this lighter shape instead (see the edge function's own
 * get-challenge-dashboard-handler.ts comment for why). Quiet: the "By Member" tab has nothing
 * useful to fall back to on a real failure besides showing nothing, same as an empty result.
 */
export function fetchChallengeRecordDetailHistory(
  challengeId: string,
  recordDetailUserId: string,
  from?: string,
  to?: string,
): Promise<{ recordDetailHistory: RecordDetailHistoryEntry[] } | null> {
  return request.get(`/challenges/${encodeURIComponent(challengeId)}`, {
    quiet: true,
    params: { recordDetailUserId, from, to },
  });
}

export function saveChallenge(challenge: {
  id: string;
  checklistTemplateId: string;
  shareRecords: boolean;
  commentsEnabled: boolean;
  targets: Challenge['targets'];
  recordDetailFieldIds: Challenge['recordDetailFieldIds'];
  theme: Challenge['theme'];
  backgroundImageUrl: Challenge['backgroundImageUrl'];
  greetingText: Challenge['greetingText'];
  startWidgetLayout: Challenge['startWidgetLayout'];
  greetingWidgetLayout: Challenge['greetingWidgetLayout'];
  targetsWidgetLayout: Challenge['targetsWidgetLayout'];
  buttonWidgetLayout: Challenge['buttonWidgetLayout'];
  titleWidgetLayout: Challenge['titleWidgetLayout'];
  pageBackgroundLayout: Challenge['pageBackgroundLayout'];
  pageBackgroundImageUrl: Challenge['pageBackgroundImageUrl'];
  glassOpacity: Challenge['glassOpacity'];
  checkinsChartType: Challenge['checkinsChartType'];
  startDate: string;
  endDate: string | null;
  /** Neither is a `challenges` column — see the edge function; always used now that every save enrolls the owner as a participant. */
  ownerDisplayName?: string;
  ownerAvatarUrl?: string;
}): Promise<{ challenge: Challenge } | null> {
  return request.post('/challenges', { challenge }, { quiet: true });
}
