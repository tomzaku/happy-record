import type { FieldGroup } from './fieldGroupTypes';

export type ChecklistTemplate = {
  id: string;
  title: string;
  repeat?: {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
    startedAt: string;
    /** IANA zone of whichever device last wrote this schedule (getClientTimezone) — keeps
     * `startedAt`/`endedAt` interpretable as the calendar days the writer actually picked. */
    timezone?: string;
    completedAt?: string;
    /** Last day this schedule generates an instance on, symmetric with `startedAt`. Absent means
     * no end date. */
    endedAt?: string;
    /** Set only for a challenge participant's own row, distinct from the owner's default
     * (_shared/repeats.ts's `pickRepeat`) — seeded from the owner's schedule at join time
     * (challenge-participants-service.ts's `seedReminderFromOwner`), so it reads "personal"
     * immediately even before any edit. Read-only, server-computed — never send back on a write. */
    isPersonal?: boolean;
  };
  avatar: {
    type: string;
    name: string;
    color?: string;
  };
  createdAt: string;
  // @deprecated use groups instead
  records: string[];
  fieldGroups: FieldGroup[];
  tags: string[];
  visibility?: 'public' | 'private';
  /** One flag groups many templates ("Gym" for Push-ups + Pull-ups) — see store/flag. */
  flagId?: string;
  /** Lineage only, set at fork time when joining a challenge (useJoinChallenge.tsx) — never read
   * for access control. */
  copiedFromId?: string;
  /** Set when the owner has deleted this template — the row itself isn't removed, so a challenge
   * participant still resolves it (see 20260905000000_checklist_templates_soft_delete.sql), just
   * flagged. Absent means not deleted. */
  deletedAt?: string;
  updatedAt: string;
};

export type ChecklistTemplatesMap = Record<string, ChecklistTemplate>;
