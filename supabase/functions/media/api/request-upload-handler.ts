// POST /media { kind, mimeType, sizeBytes } → { id, uploadUrl, method, headers }
//
// No `compose`/`checkPermission` here — creating a brand-new row becomes this caller's own the
// moment it's created, same as every other resource's create path (see e.g. `challenges`' own
// `checkCanWriteChallenge` doc comment on why only the *update* half of a write ever needs a real
// check).

import { ApiError } from '../../../shared/cors.ts';
import { fromMediaUploadRequest } from '../../../dto/media/media-dto.ts';
import { createMedia } from '../services/media-service.ts';
import { body, type Ctx } from './media-context.ts';

export async function requestUploadHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)) ?? {};
  let parsed: ReturnType<typeof fromMediaUploadRequest>;
  try {
    parsed = fromMediaUploadRequest(entry);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid request.');
  }
  return createMedia(ctx, parsed);
}
