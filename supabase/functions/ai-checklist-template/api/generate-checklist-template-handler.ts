// `POST /ai-checklist-template { prompt, existing?, refine? }` — turns a free-text prompt into a
// ready-to-review checklist template proposal. See this resource's own index.ts doc comment for
// the full picture; this file is the actual request lifecycle (auth, rate limit, Pro gate, the
// caller's own field catalog, the prompt itself, the provider call, and validating what comes
// back).

import {
  BadRequest,
  type BuiltRequest,
  callProvider,
  corsHeaders,
  jsonResponse,
  proGateError,
  reqStr,
  requireUser,
  stripFences,
  underRateLimit,
} from '../../../shared/ai.ts';
import { admin } from '../../../shared/authorize.ts';
import {
  type AvailableField,
  FIELD_TYPES,
  isFieldType,
  SELECT_FIELD_TYPES,
  validate,
} from '../../../dto/ai-checklist-template/ai-checklist-template-dto.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** The caller's own reusable field catalog — fetched here, not trusted from the client (see this
 * resource's own doc comment). Same visibility rule `fields`' own unscoped GET uses (own rows +
 * anyone's `visibility: 'public'`) — every real field type, not just number/note (this used to
 * filter down to those two, which meant an existing text/date/datetime field could never be
 * offered for reuse at all) — capped at 60 for prompt-size budgeting, same limit the old
 * client-supplied param used to enforce. */
async function fetchAvailableFields(supabase: SupabaseClient, userId: string): Promise<AvailableField[]> {
  const { data, error } = await supabase
    .from('fields')
    .select('title, icon, type, unit, options')
    .or(`user_id.eq.${userId},visibility.eq.public`)
    .in('type', FIELD_TYPES)
    .order('created_at')
    .limit(60);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[])
    .map((f) => {
      const type = isFieldType(f.type) ? f.type : 'number' as const;
      const options = Array.isArray(f.options)
        ? f.options.filter((o): o is string => typeof o === 'string').slice(0, 20)
        : [];
      return {
        title: String(f.title ?? '').slice(0, 60),
        icon: String(f.icon ?? '').slice(0, 80),
        type,
        unit: String(f.unit ?? '').slice(0, 20),
        ...(SELECT_FIELD_TYPES.has(type) && options.length ? { options } : {}),
      };
    })
    .filter((f) => f.title);
}

function build(p: Record<string, unknown>, availableFields: AvailableField[]): BuiltRequest {
  const prompt = reqStr(p, 'prompt', 500);

  const existing = p.existing && typeof p.existing === 'object'
    ? p.existing as Record<string, unknown>
    : null;
  const existingTitle = existing ? String(existing.title ?? '').slice(0, 120) : null;
  const existingGroups = existing && Array.isArray(existing.fieldGroups)
    ? existing.fieldGroups.slice(0, 20).map((g) => ({
      title: String((g as Record<string, unknown>)?.title ?? '').slice(0, 60),
      fields: Array.isArray((g as Record<string, unknown>)?.fields)
        ? ((g as Record<string, unknown>).fields as unknown[]).slice(0, 20).map((f) => String(f).slice(0, 60))
        : [],
    }))
    : [];

  const fieldsCatalog = availableFields.length
    ? availableFields.map((f) => {
      const detail = f.unit
        ? `, unit: ${f.unit}`
        : f.options?.length
          ? `, options: ${f.options.map((o) => `"${o}"`).join(', ')}`
          : '';
      return `- "${f.title}" (${f.type}${detail})`;
    }).join('\n')
    : '(none yet)';

  const context = existing
    ? `The user is adding to an EXISTING checklist template titled "${existingTitle}", which already has these groups:\n${
      existingGroups.length
        ? existingGroups.map((g) => `- "${g.title}": ${g.fields.join(', ') || '(no fields)'}`).join('\n')
        : '(no groups yet)'
    }\nPropose NEW groups to add — do not repeat the existing group titles above.`
    : 'The user wants a BRAND NEW checklist template from scratch — propose a title, an icon/color, and its groups.';

  // A feedback-driven follow-up on a proposal from an earlier call to this same function, not a
  // fresh generation — "previous" is re-validated through the exact same `validate()` this
  // function uses on its own output (bounds every field/count the same way, and throwing on a
  // genuinely malformed payload is the right behavior here too), so the model always sees a
  // proposal shaped exactly like what it's expected to return.
  const refineRaw = p.refine && typeof p.refine === 'object' ? p.refine as Record<string, unknown> : null;
  const refine = refineRaw
    ? { feedback: reqStr(refineRaw, 'feedback', 500), previous: validate(refineRaw.previous) }
    : null;

  const prompt_ = `${context}

The user's original request: "${prompt}"
${
    refine
      ? `
You already proposed this, based on that request:
${JSON.stringify(refine.previous)}

The user's follow-up feedback on that proposal: "${refine.feedback}"

Revise your proposal to address this feedback. Keep everything the feedback doesn't mention the same, unless the feedback clearly implies a broader change. Output the FULL revised proposal in the exact same JSON shape as before — not just the parts that changed.
`
      : ''
  }
The user's existing fields — for each field a group needs, check this list first:
${fieldsCatalog}
If one of these is a genuine conceptual match for what the group needs to track, reuse its EXACT title instead of inventing a near-duplicate (e.g. don't propose "Push-ups" when "Push Ups" already exists). But do NOT force-fit an existing field onto something it doesn't really match just to avoid creating a new one — a mismatched reuse is worse than a new field. When nothing on the list actually fits, propose a brand new field with a title, icon, type, and unit that genuinely suit what's being tracked.

Design a small set of groups (usually 1-4) that break the request into a sane weekly structure. Each group:
- has a short title (e.g. "Push Day", "Morning Routine")
- has a "note": 2-5 content blocks explaining how to do it — see the block shapes below
- has a "repeat" schedule: which day(s) of the week it happens and what time, OR null if it should show every day
- has 1-6 fields to record when doing it, each one of:
  - "number" — a quantity (reps, minutes, weight, distance). Give it a "unit" (e.g. "reps", "minutes", "kg"). May set "defaultValue" (a sensible starting number, e.g. 0) to pre-fill the entry — omit it entirely when there's no sensible default.
  - "note" — a free-written log entry (how the workout felt, what to improve next time).
  - "text" — a short single-line answer that isn't a number (e.g. "Route taken", "Who you trained with").
  - "date" — a single calendar date (e.g. "Date of last checkup").
  - "datetime" — a specific date AND time (e.g. "Bedtime", "Woke up at").
  - "select" — pick exactly ONE from a fixed list you provide (e.g. "Mood": Great/Good/Okay/Bad). Give it 2-6 short "options".
  - "multiselect" — pick ANY NUMBER from a fixed list you provide (e.g. "Muscle Groups Worked": Chest/Back/Legs/Arms/Core). Give it 2-8 short "options".
  "unit"/"defaultValue" only ever apply to "number"; "options" only ever applies to "select"/"multiselect" — leave "unit" as an empty string, omit "defaultValue", and omit "options" entirely for whichever of the two doesn't apply to a given field's own type.

A group's "note" is an array of blocks, each one of:
  { "type": "heading", "text": "short heading, e.g. 'How to do it'" }
  { "type": "paragraph", "text": "1-3 sentences of beginner-friendly guidance" }
  { "type": "quote", "text": "a short motivating tip or form cue", "caption": "optional short attribution, empty string if none" }
  { "type": "video", "url": "https://www.youtube.com/watch?v=...", "caption": "short label for what the video shows" }
Most groups just need one "heading" and one "paragraph". Only add a "quote" when you have a genuinely useful form cue or motivating line for it. Only add a "video" block when you are confident the URL points to a real, specific, existing YouTube video (e.g. a well-known channel's tutorial for that exact exercise) — if you are not certain a video is real, leave it out entirely rather than guessing a URL; a broken or wrong video is worse than no video.

Icon names must be Iconify icon identifiers in "collection:name" form (e.g. "iconoir:gym", "solar:dumbbell-large-linear", "solar:running-round-linear") — pick ones that plausibly exist, favoring the "solar" or "iconoir" collections since this app already uses them. Color must be a 6-digit hex string.

Return ONLY this JSON, no markdown, no extra text:
{
  "title": "short template title (3-6 words)",
  "avatar": { "name": "iconify-icon-id", "color": "#RRGGBB" },
  "tags": ["1-3 short lowercase tags"],
  "fieldGroups": [
    {
      "title": "group title",
      "note": [ { "type": "heading" | "paragraph" | "quote" | "video", "text": "...", "caption": "...", "url": "..." } ],
      "repeat": { "hour": "8", "minute": "0", "dayOfWeek": "1,4" } | null,
      "fields": [
        { "title": "field title", "icon": "iconify-icon-id", "type": "number" | "note" | "text" | "date" | "datetime" | "select" | "multiselect", "unit": "reps/minutes/etc, empty string except for \"number\"", "defaultValue": "a number, only for \"number\" fields with a sensible default — omit this key entirely otherwise", "options": "an array of 2-8 short strings, only for \"select\"/\"multiselect\" — omit this key entirely otherwise", "description": "one short sentence" }
      ]
    }
  ]
}

"dayOfWeek" is a comma-separated list of day numbers, Sunday=0 through Saturday=6 (e.g. Mon+Thu = "1,4"), or "*" for every day.${
    existing ? ' Omit "title", "avatar" from consideration for renaming the existing template — still fill them in your JSON (they may be reused optionally by the caller) but do not assume they will replace the existing ones.' : ''
  }`;

  return {
    system: 'You design checklist/habit-tracking templates for a personal productivity app. Return ONLY valid JSON matching the requested schema — no markdown fences, no commentary.',
    messages: [{ role: 'user', content: prompt_ }],
    // Bumped from 2000 — structured note blocks (heading/paragraph/quote/video, each its own
    // JSON object) are meaningfully more verbose per group than the single sentence this used to
    // be, and up to 8 groups' worth can add up.
    maxTokens: 3000,
  };
}

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
    built = build(params, availableFields);
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
