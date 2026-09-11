import { Challenge, ChallengeParticipant, ChartType } from '@dreamer/global';

export type Target = {
  id: string;
  title: string;
  unit: string;
  /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
  icon: string;
  goal: number;
  contributions: { userId: string; total: number }[];
  /** This target's own "Breakdown by participant" chart type — see StreaksCard. */
  chartType: ChartType;
};

/** The dashboard's own "Record Detail" section — a plain per-field contribution total, no goal
 * the way `Target` has one. One entry per `Challenge.recordDetailFieldIds`. */
export type RecordDetail = {
  fieldId: string;
  title: string;
  /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
  icon: string;
  unit: string;
  contributions: { userId: string; total: number }[];
};

export type Attachment = {
  userId: string;
  fieldId: string;
  title: string;
  icon: string;
  kind: 'photo' | 'video';
  mediaId: string;
  createdAt: string;
};

export type LogFieldValue = {
  fieldId: string;
  title: string;
  /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
  icon: string;
  unit: string;
  /** Picks how `value` below renders — number-with-unit, plain text via
   * `formatFieldValueForDisplay`, or via `mediaId` for `'photo'`/`'video'`. */
  type: string;
  value: number | string;
  mediaId?: string;
};

/** One Submit click, from any visible participant — the dashboard's cross-participant activity
 * log. See RecordDetailHistoryEntry (global's challengesApi.ts) for the single-member shape this
 * mirrors. */
export type LogEntry = {
  submissionId: string;
  userId: string;
  createdAt: string;
  values: LogFieldValue[];
};

export type Dashboard = {
  challenge: Challenge | null;
  participants: ChallengeParticipant[];
  completions: { userId: string; date: string }[];
  ranking: { userId: string; count: number }[];
  targets: Target[];
  recordDetails: RecordDetail[];
  attachments: Attachment[];
  logs: LogEntry[];
};
