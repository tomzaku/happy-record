// `checkPermission` functions for the `media` resource. See CLAUDE.md's "Authorization: app layer,
// not RLS" and `shared/authorize.ts`'s own header for the general shape.

import { ForbiddenError } from '../../../shared/authorize.ts';
import { ApiError } from '../../../shared/cors.ts';
import {
  fetchChecklistTemplateIdForMedia,
  fetchMediaById,
  fetchSharedChallengeParticipation,
} from '../repository/media-repository.ts';
import type { Ctx } from '../api/media-context.ts';
import type { MediaRow } from '../../../dto/media/media-dto.ts';

/**
 * For `GET /:id` — owner always allowed; otherwise a fellow challenge participant, but only once
 * the media is actually attached to a submitted checklist record (so there's something to check
 * peer-participation against at all) and only when that challenge has `share_records` on. See
 * `media-repository.ts`'s own doc comments for why each step is shaped the way it is.
 */
export async function checkCanReadMedia({ db, userId, id }: Ctx): Promise<MediaRow> {
  const row = await fetchMediaById(db, id!);
  if (!row) throw new ApiError(404, 'Not found.');
  if (row.user_id === userId) return row;

  const checklistTemplateId = await fetchChecklistTemplateIdForMedia(db, row.user_id, row.id);
  if (!checklistTemplateId) throw new ForbiddenError();

  const canView = await fetchSharedChallengeParticipation(db, {
    mediaOwnerId: row.user_id,
    viewerId: userId,
    checklistTemplateId,
  });
  if (!canView) throw new ForbiddenError();
  return row;
}

/** For `DELETE /:id` — owner-only, no peer path (unlike reading, deleting someone else's upload
 * is never something a shared challenge should grant). */
export async function checkCanDeleteMedia({ db, userId, id }: Ctx): Promise<MediaRow> {
  const row = await fetchMediaById(db, id!);
  if (!row) throw new ApiError(404, 'Not found.');
  if (row.user_id !== userId) throw new ForbiddenError();
  return row;
}
