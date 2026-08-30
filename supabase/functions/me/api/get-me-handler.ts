// `GET /me` — the caller's own Pro entitlement. No `checkPermission` here: the repository already
// hard-filters `.eq('user_id', userId)` itself, so there's no cross-user visibility decision to
// make.

import { getProStatus } from '../services/me-service.ts';
import type { Ctx } from './me-context.ts';

export async function getMeHandler(ctx: Ctx) {
  return getProStatus(ctx);
}
