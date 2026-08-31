// `POST /notes { note }` — `compose(checkWriteNote, saveNoteCore)`: checkWriteNote (see
// services/notes-access-service.ts) parses the body and confirms ownership of an existing id;
// this is just the write itself once that's settled, via services/notes-service.ts.

import { ApiError } from '../../../shared/cors.ts';
import { compose } from '../../../shared/authorize.ts';
import { fromNote } from '../../../dto/notes/notes-dto.ts';
import { checkWriteNote, type WriteAuthorization } from '../services/notes-access-service.ts';
import { saveNote } from '../services/notes-service.ts';
import type { Ctx } from './notes-context.ts';

async function saveNoteCore(ctx: Ctx, { entry }: WriteAuthorization) {
  let row: ReturnType<typeof fromNote>;
  try {
    row = fromNote(entry);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid note.');
  }

  await saveNote(ctx, row);
  return { ok: true };
}

export const saveNoteHandler = compose(checkWriteNote, saveNoteCore);
