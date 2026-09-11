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

export type Dashboard = {
  challenge: Challenge | null;
  participants: ChallengeParticipant[];
  completions: { userId: string; date: string }[];
  ranking: { userId: string; count: number }[];
  targets: Target[];
  recordDetails: RecordDetail[];
  attachments: Attachment[];
};
