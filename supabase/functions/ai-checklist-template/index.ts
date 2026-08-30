// Pro-only: turns a free-text prompt ("help me build a gym schedule to build muscle") into a
// ready-to-review checklist template proposal — groups, each with its own fields, an
// instructional note, a day/time schedule, and a suggested icon/color. Used from two places in
// the client: the task detail page (`existing` present — propose groups to add to that
// template) and the Home tab (`existing` absent — propose a whole new template), both via
// packages/global/src/store/checklists/aiChecklistTemplateApi.ts.
//
//   POST /ai-checklist-template { prompt, existing?, refine? } → GeneratedTemplate   Pro
//
// The "reuse an existing field where it fits" catalog isn't a client-supplied param — this
// fetches the caller's own real fields directly (own rows + anyone's `visibility: 'public'`
// ones, the same scope `fields/index.ts`'s own unscoped GET uses), same reasoning CLAUDE.md's
// own "go through an edge function, not the table" gives for everything else here: a client-sent
// list can be stale (edited/deleted elsewhere since the page loaded) or simply wrong, and there's
// no reason to trust it when the real data is one query away with the caller's own id already in
// hand.
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
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Mirrors RecordField.type (packages/global/src/store/record-field/useRecordField.tsx) — every
// type a real field can be, not just the two this used to be limited to. 'metric' was renamed
// 'number' in 20260829080000_field_type_metric_to_number.sql; nothing here ever dealt with that
// old name. 'select'/'multiselect' added in 20260829110000_field_types_select.sql.
type FieldType = 'number' | 'note' | 'text' | 'date' | 'datetime' | 'select' | 'multiselect';
const FIELD_TYPES: readonly FieldType[] = ['number', 'note', 'text', 'date', 'datetime', 'select', 'multiselect'];
const isFieldType = (v: unknown): v is FieldType => FIELD_TYPES.includes(v as FieldType);
const SELECT_FIELD_TYPES = new Set<FieldType>(['select', 'multiselect']);

interface AvailableField {
  title: string;
  icon: string;
  type: FieldType;
  unit: string;
  // select/multiselect-only — see GeneratedField.options' own comment.
  options?: string[];
}

interface GeneratedField {
  title: string;
  icon: string;
  type: FieldType;
  unit: string;
  description: string;
  // number-only (see RecordField.defaultValue's own comment) — pre-fills the daily submit
  // screen's input for this field instead of starting blank. Omitted (not just left at some
  // default number) for every other type, and for a number field the AI doesn't have a sensible
  // starting value for.
  defaultValue?: number;
  // select/multiselect-only, and required for them (see RecordField.options' own comment and
  // _shared/fields.ts's own validation) — the fixed list of choices this field offers.
  options?: string[];
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

/** The caller's own reusable field catalog — fetched here, not trusted from the client (see
 * this module's own doc comment). Same visibility rule `fields/index.ts`'s own unscoped GET
 * uses (own rows + anyone's `visibility: 'public'`) — every real field type, not just
 * number/note (this used to filter down to those two, which meant an existing text/date/
 * datetime field could never be offered for reuse at all) — capped at 60 for prompt-size
 * budgeting, same limit the old client-supplied param used to enforce. */
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
        // Used to collapse anything but "note" down to "number" — silently turning a genuine
        // "text"/"date"/"datetime"/"select"/"multiselect" proposal into a number field.
        // isFieldType checks against the real value set instead (see its own comment); an
        // unrecognized/missing type still falls back to "number", same default as before.
        let type: FieldType = isFieldType(f.type) ? f.type : 'number';
        const options = Array.isArray(f.options)
          ? f.options
            .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
            .map((o) => o.trim().slice(0, 60))
            .slice(0, 8)
          : [];
        // A select/multiselect field genuinely needs real options — _shared/fields.ts's own
        // validation rejects one that doesn't when this actually gets applied. Rather than
        // failing the whole proposal over one malformed field, this one field quietly becomes
        // "text" instead (same shape it'd have anyway: no unit, no options).
        if (SELECT_FIELD_TYPES.has(type) && options.length === 0) type = 'text';
        return {
          title: typeof f.title === 'string' && f.title.trim() ? f.title.trim().slice(0, 60) : 'Field',
          icon: typeof f.icon === 'string' && f.icon.includes(':') ? f.icon.slice(0, 80) : 'solar:document-linear',
          type,
          unit: typeof f.unit === 'string' ? f.unit.slice(0, 20) : '',
          description: typeof f.description === 'string' ? f.description.slice(0, 200) : '',
          // number-only, and only when the model actually gave a finite number — see
          // GeneratedField.defaultValue's own comment.
          ...(type === 'number' && typeof f.defaultValue === 'number' && Number.isFinite(f.defaultValue)
            ? { defaultValue: f.defaultValue }
            : {}),
          ...(SELECT_FIELD_TYPES.has(type) ? { options } : {}),
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

  let availableFields: AvailableField[];
  try {
    availableFields = await fetchAvailableFields(auth.supabase, auth.user.id);
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

if (import.meta.main) Deno.serve(handler);
