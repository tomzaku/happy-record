// Client for the `ai-checklist-template` edge function — see CLAUDE.md ("Data access: go
// through an edge function") and supabase/functions/ai-checklist-template/index.ts for the
// prompt/validation this wraps. Pro-only; the server is the real gate (a 403 here means "not
// Pro", not "offline").
//
// Unlike almost every other call in this app, this is NOT `quiet: true` — there's no local
// fallback for "the AI didn't run." A rate limit, a missing Pro grant, or a provider error all
// need to reach the caller so the generate UI can show it, not silently do nothing.

import { request } from '../../lib/api';

export type AiAvailableField = {
  title: string;
  icon: string;
  type: 'metric' | 'note';
  unit: string;
};

export type AiGenerateChecklistTemplateParams = {
  prompt: string;
  /** Present only when generating additions for an existing template (the task detail page). */
  existing?: {
    title: string;
    fieldGroups: { title: string; fields: string[] }[];
  };
  /** The caller's own + public fields, so the model reuses one instead of inventing a duplicate. */
  availableFields: AiAvailableField[];
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
  type: 'metric' | 'note';
  unit: string;
  description: string;
};

// Mirrors supabase/functions/ai-checklist-template's own GeneratedNoteBlock — a short sequence of
// typed content blocks (not plain text), so the client can build a real multi-block Editor.js
// document instead of always wrapping text in a single paragraph. See
// useApplyAiChecklistTemplate.ts's buildNoteFromBlocks for that mapping. `video`'s `videoId` has
// already been extracted and format-validated server-side — it's shaped like a real YouTube
// video id, though the server can't confirm the video itself actually exists.
export type AiGeneratedNoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; caption: string }
  | { type: 'video'; videoId: string; caption: string };

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
