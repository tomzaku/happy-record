// Business logic for `me` — no real cross-user visibility decision here (the repository already
// hard-filters `.eq('user_id', userId)`), but the trial-lapsed check belongs here, not `api/`.

import { fetchProUser } from '../repository/me-repository.ts';
import type { Ctx } from '../api/me-context.ts';

export type ProStatus = {
  isPro: boolean;
  isTrial: boolean;
  proExpiresAt: string | null;
};

export async function getProStatus({ db, userId }: Ctx): Promise<ProStatus> {
  const row = await fetchProUser(db, userId);

  const expiresAt = row?.expires_at ?? null;
  // Re-checked here rather than trusted as a plain "row exists" — a trial that was active last
  // time this was read may have lapsed since.
  const isPro = Boolean(row) && (!expiresAt || new Date(expiresAt) > new Date());

  return {
    isPro,
    isTrial: isPro && row?.note === 'trial',
    proExpiresAt: isPro ? expiresAt : null,
  };
}
