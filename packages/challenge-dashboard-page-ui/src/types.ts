import { Challenge, ChallengeParticipant } from '@dreamer/global';

export type Target = {
  fieldId: string;
  title: string;
  unit: string;
  /** The field's own Iconify icon — see useRecordField.tsx's `RecordField.icon`. */
  icon: string;
  target: number;
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
  attachments: Attachment[];
};
