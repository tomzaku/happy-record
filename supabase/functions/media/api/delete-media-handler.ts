// DELETE /media/:id → { ok: true }
//
// Owner-only early delete (before the 20-day TTL) — e.g. a user removing a photo they just
// attached before it's even referenced by a submitted record.

import { compose } from '../../../shared/authorize.ts';
import { checkCanDeleteMedia } from '../services/media-access-service.ts';
import { deleteMedia } from '../services/media-service.ts';
import type { Ctx } from './media-context.ts';

export const deleteMediaHandler = compose(checkCanDeleteMedia, async (ctx: Ctx, row) => {
  await deleteMedia(ctx, row);
  return { ok: true as const };
});
