// Central query-key factory for the `field-group-completions` resource — mirrors flagsKeys.ts's
// own shape.

export const fieldGroupCompletionsKeys = {
  all: ['field-group-completions'] as const,
  /** Scoped to one day's checklist — the only scope any consumer needs (see
   * useFieldGroupCompletions.tsx: a group's own done state only ever matters for the day being
   * viewed right now). */
  list: (checklistId: string | undefined) => [...fieldGroupCompletionsKeys.all, checklistId] as const,
};
