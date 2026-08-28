// Pro-only: turns a free-text prompt ("plan a 3-day trip to Kyoto") into a ready-to-insert note —
// a short sequence of typed content blocks the client renders straight into Editor.js
// (@moon-ui/note-editor). Called from that package's own "/ai" block tool (AiWriteTool.tsx) via
// packages/global/src/hook/useAiNoteGenerate.ts / store/note/aiNoteApi.ts — see CLAUDE.md's
// "Data access: go through an edge function".
//
//   POST /ai-note { prompt, options } → { blocks: GeneratedNoteBlock[] }   Pro
//
// `options` is which extra block types (beyond the always-available heading/paragraph) the user
// toggled on in the composer — a subset of "video"/"quote"/"checklist"/"list". Mirrors
// ai-checklist-template's own GeneratedNoteBlock shape (that function's groups reuse the same 4
// base variants for their own note) extended with `checklist`/`list`, which only this function
// emits.
//
// SECURITY: params are validated below; the system prompt is fixed here and never reaches the
// client. A signed-in Pro user is required and rate-limited — see _shared/ai.ts.
//
// Deploy: `supabase functions deploy ai-note`

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

const OPTIONS = ['video', 'quote', 'checklist', 'list'] as const;
type Option = typeof OPTIONS[number];

type GeneratedNoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; caption: string }
  | { type: 'video'; videoId: string; caption: string }
  | { type: 'checklist'; items: { text: string; checked: boolean }[] }
  | { type: 'list'; style: 'ordered' | 'unordered'; items: string[] };

function sanitizeOptions(v: unknown): Option[] {
  if (!Array.isArray(v)) return [];
  const set = new Set(v.filter((o): o is Option => OPTIONS.includes(o as Option)));
  return OPTIONS.filter(o => set.has(o));
}

const OPTION_BLOCK_DOCS: Record<Option, string> = {
  video: '  { "type": "video", "url": "https://www.youtube.com/watch?v=...", "caption": "short label for what the video shows" } — the user explicitly asked for a video, so make a genuine attempt: pick the video you\'d most confidently bet is real and on-topic (a well-known creator\'s definitive tutorial/explainer, an official trailer or music video, a famous talk) rather than defaulting to skipping it. Still don\'t invent an id for something obscure you have no real basis for — but "probably right" beats "omitted" here.',
  quote: '  { "type": "quote", "text": "a short, genuinely useful quote, tip, or motivating line", "caption": "optional short attribution, empty string if none" }',
  checklist: '  { "type": "checklist", "items": [ { "text": "an action item", "checked": false } ] } — 2-8 items, "checked" almost always false (this is a fresh checklist, not a completed one) unless the user\'s own prompt describes something already done.',
  list: '  { "type": "list", "style": "ordered" | "unordered", "items": [ "an item" ] } — 2-8 items, "ordered" when sequence/ranking matters, "unordered" otherwise.',
};

function build(p: Record<string, unknown>): BuiltRequest {
  const prompt = reqStr(p, 'prompt', 500);
  const options = sanitizeOptions(p.options);

  const blockDocs = [
    '  { "type": "heading", "text": "short section heading" }',
    '  { "type": "paragraph", "text": "1-4 sentences of real, useful content" }',
    ...options.map(o => OPTION_BLOCK_DOCS[o]),
  ].join('\n');

  const prompt_ = `The user wants to write a note about: "${prompt}"

Write helpful, well-organized note content as a sequence of 3-10 content blocks. Only use these block types — nothing else is supported:
${blockDocs}

Structure it the way a genuinely useful note on this topic would be structured: start with a heading unless the whole note is one short thought, break distinct ideas into their own paragraph, and only reach for ${options.length ? options.join('/') : 'the other block types'} when it actually fits the content — don't force one in just because it's available.

Return ONLY this JSON, no markdown, no extra text:
{ "blocks": [ { "type": "...", ... } ] }`;

  return {
    system: 'You write clear, well-organized notes for a personal note-taking app. Return ONLY valid JSON matching the requested schema — no markdown fences, no commentary.',
    messages: [{ role: 'user', content: prompt_ }],
    maxTokens: 1500,
  };
}

// See ai-checklist-template's own copy of this — kept duplicated rather than shared, since
// nothing else in _shared/ needs it and these are two independent, self-contained functions.
const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;

function extractYoutubeId(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const match = url.match(YOUTUBE_ID_RE);
  return match ? match[1].slice(0, 20) : null;
}

function validateBlocks(raw: unknown): GeneratedNoteBlock[] {
  if (!Array.isArray(raw)) throw new Error('AI returned no content.');
  const blocks: GeneratedNoteBlock[] = [];
  for (const item of raw.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const text = typeof b.text === 'string' ? b.text.trim().slice(0, 500) : '';
    const caption = typeof b.caption === 'string' ? b.caption.trim().slice(0, 100) : '';

    if (b.type === 'heading' && text) {
      blocks.push({ type: 'heading', text });
    } else if (b.type === 'quote' && text) {
      blocks.push({ type: 'quote', text, caption });
    } else if (b.type === 'video') {
      const videoId = extractYoutubeId(b.url);
      if (videoId) blocks.push({ type: 'video', videoId, caption });
      // Else silently dropped — see YOUTUBE_ID_RE's comment.
    } else if (b.type === 'checklist' && Array.isArray(b.items)) {
      const items = b.items
        .slice(0, 12)
        .filter((it): it is Record<string, unknown> => !!it && typeof it === 'object')
        .map(it => ({
          text: typeof it.text === 'string' ? it.text.trim().slice(0, 200) : '',
          checked: it.checked === true,
        }))
        .filter(it => it.text);
      if (items.length) blocks.push({ type: 'checklist', items });
    } else if (b.type === 'list' && Array.isArray(b.items)) {
      const items = b.items
        .slice(0, 12)
        .map(it => (typeof it === 'string' ? it.trim().slice(0, 200) : ''))
        .filter(Boolean);
      if (items.length) {
        blocks.push({ type: 'list', style: b.style === 'ordered' ? 'ordered' : 'unordered', items });
      }
    } else if (text) {
      // Anything else with real text (including a plain "paragraph") falls back to a paragraph
      // — cheaper than rejecting the whole note over one malformed block.
      blocks.push({ type: 'paragraph', text });
    }
  }
  if (blocks.length === 0) throw new Error('AI returned no usable content.');
  return blocks;
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
    const p = (parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {});
    return jsonResponse(200, { blocks: validateBlocks(p.blocks) });
  } catch (err) {
    console.error('[ai-note]', err);
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
}

if (import.meta.main) Deno.serve(handler);
