// The one thing actually specific to `ai-note` — everything else (routing, auth, rate limit,
// Pro gate, provider call) lives in `shared/aiNoteGeneration.ts`'s `runNoteGeneration`, shared
// with every other `ai-*` function, so there's no local ROUTES table here the way CRUD resources
// have: `runNoteGeneration` already owns "is this a POST" and dispatches straight into this
// resolver, which just wires the raw params through to `services/ai-note-service.ts`.
//
// Every note surface in the app is addressed by a plain `notes.id` now (see
// 20260829010000_notes_note_id_ownership.sql — the owning field/field-group holds its own
// `note_id`, not the other way around), so "resolve this note's real existing content" is always
// the same lookup: `notes` by id, scoped to the caller.

export { resolveNoteContext } from '../services/ai-note-service.ts';
