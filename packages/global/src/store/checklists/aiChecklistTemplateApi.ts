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
};

export type AiGeneratedField = {
  title: string;
  icon: string;
  type: 'metric' | 'note';
  unit: string;
  description: string;
};

export type AiGeneratedGroup = {
  title: string;
  note: string;
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
