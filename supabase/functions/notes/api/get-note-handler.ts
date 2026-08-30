// `GET /notes/:id` — one note, full content (`value` included). Caller's own, or anyone's if
// it's a field-group's Home note on a `visibility: 'public'` template (checkReadNote) — this is
// what lets a challenge participant's `useNoteById` resolve the sharer's note instead of coming
// back empty.

import { compose } from '../../../shared/authorize.ts';
import { toNote } from '../../../dto/notes/notes-dto.ts';
import { checkReadNote } from '../services/notes-access-service.ts';
import type { NoteRow } from '../services/notes-access-service.ts';

export const getNoteHandler = compose(checkReadNote, async (_ctx, row: NoteRow) => ({ notes: [toNote(row)] }));
