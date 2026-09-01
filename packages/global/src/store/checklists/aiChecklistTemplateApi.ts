// Client for the `ai-checklist-template` edge function — see CLAUDE.md ("Data access: go
// through an edge function") and supabase/functions/ai-checklist-template/index.ts for the
// prompt/validation this wraps. Pro-only; the server is the real gate (a 403 here means "not
// Pro", not "offline").
//
// Unlike almost every other call in this app, this is NOT `quiet: true` — there's no local
// fallback for "the AI didn't run." A rate limit, a missing Pro grant, or a provider error all
// need to reach the caller so the generate UI can show it, not silently do nothing.

import { request } from '../../lib/api';
import type { AiGeneratedNoteBlock } from '../../lib/editorJsNoteBlocks';

export type { AiGeneratedNoteBlock };

export type AiGenerateChecklistTemplateParams = {
  prompt: string;
  /** Present only when generating additions for an existing template (the task detail page). */
  existing?: {
    title: string;
    fieldGroups: { title: string; fields: string[] }[];
  };
  /**
   * Present when this is a feedback-driven follow-up on an already-generated proposal, not a
   * fresh generation — `previous` is echoed straight back as context and `feedback` is the
   * user's free-text change request ("make Push Day easier"); see AiChecklistGenerate's
   * `handleRevise` and the edge function's own prompt for how it's used.
   */
  refine?: {
    previous: AiGeneratedChecklistTemplate;
    feedback: string;
  };
};

export type AiGeneratedField = {
  title: string;
  icon: string;
  // Mirrors RecordField.type (useRecordField.tsx) except 'photo'/'video' (20260901000000_media.sql)
  // — an AI proposal has no way to produce a meaningful upload for either, so those two are
  // deliberately left out here, matching the server's own separate FieldType in
  // dto/ai-checklist-template/ai-checklist-template-dto.ts, which never gained them either.
  type: 'number' | 'note' | 'text' | 'date' | 'datetime' | 'select' | 'multiselect';
  unit: string;
  description: string;
  /** number-only — see the server's own GeneratedField.defaultValue comment. */
  defaultValue?: number;
  /** select/multiselect-only, and required for them — see the server's own GeneratedField.options
   * comment. */
  options?: string[];
};

// Mirrors supabase/functions/ai-checklist-template's own GeneratedNoteBlock — a short sequence of
// typed content blocks (not plain text), so the client can build a real multi-block Editor.js
// document instead of always wrapping text in a single paragraph. `AiGeneratedNoteBlock` itself
// (re-exported above) lives in lib/editorJsNoteBlocks.ts, shared with ai-note's own note
// generation — see that file for the block-shape mapping and useApplyAiChecklistTemplate.ts for
// how this feature uses it. `video`'s `videoId` has already been extracted and format-validated
// server-side — it's shaped like a real YouTube video id, though the server can't confirm the
// video itself actually exists. (ai-checklist-template's own prompt never emits the `checklist`/
// `list` variants that type also allows — those are ai-note-only today.)

export type AiGeneratedGroup = {
  title: string;
  note: AiGeneratedNoteBlock[];
  repeat: { hour: string; minute: string; dayOfWeek: string } | null;
  fields: AiGeneratedField[];
};

export type AiGeneratedChecklistTemplate = {
  title: string;
  avatar: { name: string; color: string };
  tags: string[];
  fieldGroups: AiGeneratedGroup[];
};

export function generateChecklistTemplate(
  params: AiGenerateChecklistTemplateParams,
  opts: { signal?: AbortSignal } = {},
): Promise<AiGeneratedChecklistTemplate> {
  // Generation is slow — give it real headroom over the default 8s.
  return request.post('/ai-checklist-template', params, { signal: opts.signal, timeout: 60_000 });
}
