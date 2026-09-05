// Query-key factory for pro-entitlement status — a single small read-only row per identity, not
// a keyed collection, so there's just the one key.

export const proStatusKeys = {
  status: (userId: string | undefined) => ['pro-status', userId] as const,
};
