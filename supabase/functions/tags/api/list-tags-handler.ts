// `GET /tags` — always the caller's own, nothing to compose a `checkPermission` around.

import { toTag } from '../../../dto/tags/tags-dto.ts';
import { listTags } from '../services/tags-service.ts';
import type { Ctx } from './tags-context.ts';

export async function listTagsHandler(ctx: Ctx) {
  const rows = await listTags(ctx);
  return { tags: rows.map(toTag) };
}
