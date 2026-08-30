// `GET /me` — the caller's own Pro entitlement. No `checkPermission` here: `getProStatus`
// already hard-filters `.eq('user_id', userId)` itself (see shared/proUsers.ts), so there's no
// cross-user visibility decision to make.

import { getProStatus } from '../../../shared/proUsers.ts';
import type { Ctx } from './me-context.ts';

export async function getMeHandler({ db, userId }: Ctx) {
  return getProStatus(db, userId);
}
