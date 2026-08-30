// `POST /ai-checklist-template { prompt, existing?, refine? }` — turns a free-text prompt into a
// ready-to-review checklist template proposal. See this resource's own index.ts doc comment for
// the full picture; this file is the actual request lifecycle (auth, rate limit, Pro gate, the
// provider call, and validating what comes back) — the caller's own field catalog and the prompt
// itself live in `services/ai-checklist-template-service.ts`.

import {
  BadRequest,
  type BuiltRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  proGateError,
  requireUser,
  stripFences,
  underRateLimit,
} from '../../../shared/ai.ts';
import { admin } from '../../../shared/authorize.ts';
import { type AvailableField, validate } from '../../../dto/ai-checklist-template/ai-checklist-template-dto.ts';
import { buildGenerationRequest, fetchAvailableFields } from '../services/ai-checklist-template-service.ts';

export async function generateChecklistTemplateHandler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use AI features.' });
  const db = admin();

  if (!await underRateLimit(db, auth.user.id)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  const denied = await proGateError(db, auth.user.id);
  if (denied) return denied;

  let params: Record<string, unknown>;
  try {
    params = (await req.json() ?? {}) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  let availableFields: AvailableField[];
  try {
    availableFields = await fetchAvailableFields(db, auth.user.id);
  } catch (err) {
    console.error('[ai-checklist-template] fields fetch failed', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }

  let built: BuiltRequest;
  try {
    built = buildGenerationRequest(params, availableFields);
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  try {
    const text = await callProvider(built.system, built.messages, built.maxTokens);
    const parsed = JSON.parse(stripFences(text));
    return jsonResponse(200, validate(parsed));
  } catch (err) {
    console.error('[ai-checklist-template]', err);
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
}
