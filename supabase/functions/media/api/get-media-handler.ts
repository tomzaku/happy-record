// GET /media/:id → { id, kind, mimeType, sizeBytes, createdAt, expiresAt, url }
//
// `url` is a fresh, short-lived signed URL — never cached/stored anywhere, see
// media-storage.ts's own header comment.

import { compose } from '../../../shared/authorize.ts';
import { checkCanReadMedia } from '../services/media-access-service.ts';
import { getMediaReadUrl } from '../services/media-service.ts';

export const getMediaHandler = compose(checkCanReadMedia, (_ctx, row) => getMediaReadUrl(row));
