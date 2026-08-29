// Pro-only: turns a free-text prompt ("help me build a gym schedule to build muscle") into a
// ready-to-review checklist template proposal — groups, each with its own fields, an
// instructional note, a day/time schedule, and a suggested icon/color. Used from two places in
// the client: the task detail page (`existing` present — propose groups to add to that
// template) and the Home tab (`existing` absent — propose a whole new template), both via
// packages/global/src/store/checklists/aiChecklistTemplateApi.ts.
//
//   POST /ai-checklist-template { prompt, existing?, availableFields } → GeneratedTemplate   Pro
//
// SECURITY: params are validated below; the system prompt is fixed here and never reaches the
// client. A signed-in Pro user is required and rate-limited — see _shared/ai.ts, ported from the
// sibling project's own ai-* functions rather than re-derived.
//
// Deploy: `supabase functions deploy ai-checklist-template`

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
} from '../_shared/ai.ts';

interface AvailableField {
  title: string;
  icon: string;
  type: 'number' | 'note';
  unit: string;
}

interface GeneratedField {
  title: string;
  icon: string;
  type: 'number' | 'note';
  unit: string;
  description: string;
}

// The note editor (@moon-ui/note-editor, backed by @editorjs/editorjs) supports far more than a
// paragraph of text — headings, quotes, and a YouTube embed among them. A generated group's note
// is a short sequence of typed blocks so the client can build a real Editor.js document instead
// of always wrapping plain text in a single paragraph (see useApplyAiChecklistTemplate.ts's
// buildNoteFromBlocks, which does that mapping).
type GeneratedNoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; caption: string }
  | { type: 'video'; videoId: string; caption: string };

interface GeneratedGroup {
  title: string;
  note: GeneratedNoteBlock[];
  repeat: { hour: string; minute: string; dayOfWeek: string } | null;
  fields: GeneratedField[];
}

interface GeneratedTemplate {
  title: string;
  avatar: { name: string; color: string };
  tags: string[];
  fieldGroups: GeneratedGroup[];
}

function sanitizeAvailableFields(v: unknown): AvailableField[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 60)
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      title: String(f.title ?? '').slice(0, 60),
      icon: String(f.icon ?? '').slice(0, 80),
      type: f.type === 'note' ? 'note' as const : 'number' as const,
      unit: String(f.unit ?? '').slice(0, 20),
    }))
    .filter((f) => f.title);
}

function build(p: Record<string, unknown>): BuiltRequest {
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

  const availableFields = sanitizeAvailableFields(p.availableFields);
  const fieldsCatalog = availableFields.length
    ? availableFields.map((f) => `- "${f.title}" (${f.type}${f.unit ? `, unit: ${f.unit}` : ''})`).join('\n')
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
The user's existing fields (reuse one of these EXACT titles whenever it fits, instead of inventing a near-duplicate):
${fieldsCatalog}

Design a small set of groups (usually 1-4) that break the request into a sane weekly structure. Each group:
- has a short title (e.g. "Push Day", "Morning Routine")
- has a "note": 2-5 content blocks explaining how to do it — see the block shapes below
- has a "repeat" schedule: which day(s) of the week it happens and what time, OR null if it should show every day
- has 1-6 fields to record when doing it (a mix of "number" fields like reps/duration, or a "note" field for a written log)

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
        { "title": "field title", "icon": "iconify-icon-id", "type": "number" | "note", "unit": "reps/minutes/etc, empty string for note fields", "description": "one short sentence" }
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

// Matches a youtube.com/watch, youtube.com/embed, youtube.com/shorts, or youtu.be URL and
// captures the video id. This only confirms the URL is *shaped* like a real YouTube video link —
// it can't confirm the video actually exists (that would need a live YouTube Data API call, a
// separate integration this doesn't have). A block that fails this check is dropped rather than
// passed through, so a malformed/non-YouTube URL never reaches the client as a "video" block.
const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;

function extractYoutubeId(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const match = url.match(YOUTUBE_ID_RE);
  return match ? match[1].slice(0, 20) : null;
}

function validateNoteBlocks(raw: unknown): GeneratedNoteBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: GeneratedNoteBlock[] = [];
  for (const item of raw.slice(0, 6)) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const text = typeof b.text === 'string' ? b.text.trim().slice(0, 300) : '';
    const caption = typeof b.caption === 'string' ? b.caption.trim().slice(0, 100) : '';

    if (b.type === 'heading' && text) {
      blocks.push({ type: 'heading', text });
    } else if (b.type === 'quote' && text) {
      blocks.push({ type: 'quote', text, caption });
    } else if (b.type === 'video') {
      const videoId = extractYoutubeId(b.url);
      if (videoId) blocks.push({ type: 'video', videoId, caption });
      // Else silently dropped — see YOUTUBE_ID_RE's comment.
    } else if (text) {
      // Anything else with real text (including a plain "paragraph") falls back to a paragraph
      // — cheaper than rejecting the whole group over one malformed block.
      blocks.push({ type: 'paragraph', text });
    }
  }
  return blocks;
}

function validate(parsed: unknown): GeneratedTemplate {
  if (!parsed || typeof parsed !== 'object') throw new Error('AI returned an unexpected format.');
  const p = parsed as Record<string, unknown>;

  const title = typeof p.title === 'string' && p.title.trim() ? p.title.trim().slice(0, 120) : 'Untitled';

  const avatarRaw = (p.avatar && typeof p.avatar === 'object' ? p.avatar : {}) as Record<string, unknown>;
  const name = typeof avatarRaw.name === 'string' && avatarRaw.name.includes(':') ? avatarRaw.name.slice(0, 80) : 'solar:checklist-linear';
  const color = typeof avatarRaw.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(avatarRaw.color) ? avatarRaw.color : '#607d8b';

  const tags = Array.isArray(p.tags)
    ? p.tags.filter((t): t is string => typeof t === 'string').slice(0, 5).map((t) => t.slice(0, 30))
    : [];

  if (!Array.isArray(p.fieldGroups) || p.fieldGroups.length === 0) {
    throw new Error('AI returned no groups.');
  }

  const fieldGroups: GeneratedGroup[] = p.fieldGroups.slice(0, 8).map((raw) => {
    const g = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const groupTitle = typeof g.title === 'string' && g.title.trim() ? g.title.trim().slice(0, 60) : 'Group';
    const note = validateNoteBlocks(g.note);

    let repeat: GeneratedGroup['repeat'] = null;
    if (g.repeat && typeof g.repeat === 'object') {
      const r = g.repeat as Record<string, unknown>;
      const dayOfWeek = typeof r.dayOfWeek === 'string' && r.dayOfWeek.trim() ? r.dayOfWeek.trim() : '*';
      const hour = typeof r.hour === 'string' && r.hour.trim() ? r.hour.trim() : '8';
      const minute = typeof r.minute === 'string' && r.minute.trim() ? r.minute.trim() : '0';
      repeat = { hour, minute, dayOfWeek };
    }

    const fields: GeneratedField[] = Array.isArray(g.fields)
      ? g.fields.slice(0, 8).map((rawField) => {
        const f = (rawField && typeof rawField === 'object' ? rawField : {}) as Record<string, unknown>;
        return {
          title: typeof f.title === 'string' && f.title.trim() ? f.title.trim().slice(0, 60) : 'Field',
          icon: typeof f.icon === 'string' && f.icon.includes(':') ? f.icon.slice(0, 80) : 'solar:document-linear',
          type: f.type === 'note' ? 'note' as const : 'number' as const,
          unit: typeof f.unit === 'string' ? f.unit.slice(0, 20) : '',
          description: typeof f.description === 'string' ? f.description.slice(0, 200) : '',
        };
      })
      : [];
    if (fields.length === 0) throw new Error('AI returned a group with no fields.');

    return { title: groupTitle, note, repeat, fields };
  });

  return { title, avatar: { name, color }, tags, fieldGroups };
}

/** Exported for local test harnesses. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use AI features.' });

  if (!await underRateLimit(auth.supabase)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  const denied = await proGateError(auth.supabase, auth.user.id);
  if (denied) return denied;

  let params: Record<string, unknown>;
  try {
    params = (await req.json() ?? {}) as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  let built: BuiltRequest;
  try {
    built = build(params);
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

if (import.meta.main) Deno.serve(handler);
