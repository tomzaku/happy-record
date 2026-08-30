// `POST /note-folders { folder }` — always the caller's own, nothing to compose a
// `checkPermission` around.

import { ApiError } from '../../../shared/cors.ts';
import { fromNoteFolder } from '../../../dto/note-folders/note-folders-dto.ts';
import { saveNoteFolder } from '../services/note-folders-service.ts';
import { body, type Ctx } from './note-folders-context.ts';

export async function saveNoteFolderHandler(ctx: Ctx) {
  const entry = (await body(ctx.req)).folder;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing folder.');

  let row: ReturnType<typeof fromNoteFolder>;
  try {
    row = fromNoteFolder(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid folder.');
  }

  await saveNoteFolder(ctx, row);
  return { ok: true };
}
