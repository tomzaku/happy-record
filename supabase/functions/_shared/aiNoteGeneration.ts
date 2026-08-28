// Shared "write note content blocks from a prompt (+ optional already-resolved context)"
// pipeline — ai-note, ai-field-group-note, and ai-checklist-record-note all generate the exact
// same shape of content (same block types, same validation, same prompt template); the only
// thing that ever differs between them is *where* (if anywhere) they resolve context from
// before calling in here. That's genuinely a case for sharing, unlike e.g. this file's own
// duplicated-on-purpose YOUTUBE_ID_RE-style helpers elsewhere in this codebase — those are each
// one small, resource-specific regex with no second real consumer; this is the entire ~200-line
// pipeline three separate functions were otherwise each carrying their own copy of.
//
// Doesn't handle routing/CORS/auth/rate-limit/Pro-gating/the provider call itself — those live
// in ai.ts and are common to every ai-* function, not specifically note generation. This module
// is "prompt + optional context in, validated blocks out," plus `runNoteGeneration`, which wires
// that together with ai.ts's own request-handling pieces so each function's own index.ts only
// has to supply its own context resolver.

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
} from './ai.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const OPTIONS = ['video', 'quote', 'checklist', 'list'] as const;
export type Option = typeof OPTIONS[number];

export type GeneratedNoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; caption: string }
  | { type: 'video'; videoId: string; caption: string }
  | { type: 'checklist'; items: { text: string; checked: boolean }[] }
  | { type: 'list'; style: 'ordered' | 'unordered'; items: string[] };

export function sanitizeOptions(v: unknown): Option[] {
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

/** Turns already-resolved plain-text context (or two empty strings, for none) into the LLM
 * request. Doesn't know or care where that context came from — a caller with nothing to resolve
 * (ai-note) and a caller that resolved real content server-side (ai-field-group-note/
 * ai-checklist-record-note) call this identically. */
export function buildNotePrompt(
  prompt: string,
  options: Option[],
  contextBefore: string,
  contextAfter: string,
): BuiltRequest {
  const blockDocs = [
    '  { "type": "heading", "text": "short section heading" }',
    '  { "type": "paragraph", "text": "1-4 sentences of real, useful content" }',
    ...options.map(o => OPTION_BLOCK_DOCS[o]),
  ].join('\n');

  // Only actually surfaced when there's something to show — no position, an unresolvable one, or
  // a genuinely empty note all read exactly like this whole feature didn't exist, not "surrounded
  // by two blank context sections."
  const contextSection = contextBefore || contextAfter
    ? `\nThis note already has content around where this will be inserted — write something that reads as a natural continuation, not a restart. Don't repeat what's already there.\n${
      contextBefore ? `\nContent immediately BEFORE the insertion point:\n"""\n${contextBefore}\n"""\n` : ''
    }${contextAfter ? `\nContent immediately AFTER the insertion point:\n"""\n${contextAfter}\n"""\n` : ''}`
    : '';

  const prompt_ = `The user wants to write a note about: "${prompt}"
${contextSection}
Write helpful, well-organized note content as a sequence of 3-10 content blocks. Only use these block types — nothing else is supported:
${blockDocs}

Structure it the way a genuinely useful note on this topic would be structured: start with a heading unless the whole note is one short thought, break distinct ideas into their own paragraph, and only reach for ${options.length ? options.join('/') : 'the other block types'} when it actually fits the content — don't force one in just because it's available.

Return ONLY this JSON, no markdown, no extra text:
{ "blocks": [ { "type": "...", ... } ] }`;

  return {
    system: 'You write clear, well-organized notes for a personal note-taking app. Return ONLY valid JSON matching the requested schema — no markdown fences, no commentary.',
    messages: [{ role: 'user', content: prompt_ }],
    // Up to 10 blocks, each with real content (a checklist/list block alone can carry 8 items),
    // easily runs past a smaller cap — a response cut off mid-block leaves invalid JSON (an
    // unterminated string), not just short content. 1500 was too tight for all 4 options at once;
    // matches ai-checklist-template's own budget for a similarly-sized structured response.
    maxTokens: 3000,
  };
}

const YOUTUBE_ID_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/;

function extractYoutubeId(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const match = url.match(YOUTUBE_ID_RE);
  return match ? match[1].slice(0, 20) : null;
}

export function validateBlocks(raw: unknown): GeneratedNoteBlock[] {
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

// ─── real Editor.js blocks → plain text (context resolution) ───
// Only ai-field-group-note/ai-checklist-record-note actually call extractContext/toBlocks
// (ai-note has nothing to resolve context from at all) — kept here anyway, not split into a
// third module, since it's still squarely "turn something into the plain-text context
// buildNotePrompt above accepts," not a resource-specific concern of its own.

export const MAX_CONTEXT_CHARS = 1000;

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '');

/** Same block-shape knowledge packages/global/src/lib/editorJsNoteBlocks.ts owns client-side for
 * the opposite direction (AI blocks → Editor.js blocks) — duplicated, not shared, since one runs
 * in Deno and the other in the browser bundle. `table`/`delimiter` are tools nothing here ever
 * generates but a real note can still contain. */
function blockToPlainText(block: { type?: unknown; data?: unknown }): string {
  const data = (block.data && typeof block.data === 'object' ? block.data : {}) as Record<string, unknown>;
  switch (block.type) {
    case 'header':
    case 'paragraph':
    case 'quote':
      return stripHtml(typeof data.text === 'string' ? data.text : '');
    case 'checklist':
      return Array.isArray(data.items)
        ? (data.items as { text?: unknown }[])
          .map(item => `- ${stripHtml(typeof item.text === 'string' ? item.text : '')}`)
          .join('\n')
        : '';
    case 'list':
      return Array.isArray(data.items)
        ? (data.items as { content?: unknown }[])
          .map(item => `- ${stripHtml(typeof item.content === 'string' ? item.content : '')}`)
          .join('\n')
        : '';
    case 'table':
      return Array.isArray(data.content)
        ? (data.content as unknown[][])
          .map(row => row.map(cell => stripHtml(typeof cell === 'string' ? cell : '')).join(' | '))
          .join('\n')
        : '';
    case 'embed':
      return typeof data.caption === 'string' ? stripHtml(data.caption) : '';
    case 'delimiter':
    default:
      return '';
  }
}

/** Plain-text context from a run of real blocks, capped to `MAX_CONTEXT_CHARS`. `edge` picks
 * which end of a longer run stays once it's over the cap: `'end'` for `before` (what's
 * physically closest to the cursor matters more than the note's opening) and `'start'` for
 * `after` (the opposite reasoning). */
export function extractContext(blocks: unknown[], edge: 'start' | 'end'): string {
  const text = blocks
    .filter((b): b is { type?: unknown; data?: unknown } => !!b && typeof b === 'object')
    .map(blockToPlainText)
    .filter(Boolean)
    .join('\n\n');
  return edge === 'end' ? text.slice(-MAX_CONTEXT_CHARS) : text.slice(0, MAX_CONTEXT_CHARS);
}

/** A resolved stored value (a FieldGroup's own `note`, or `checklist_records.value_text`) is
 * normally already Editor.js `{blocks:[...]}` — either a real object (jsonb columns) or a JSON
 * string (text columns). Still tolerant of a plain non-JSON string (kept as one legacy
 * paragraph rather than discarded) or anything else (no usable content) — never throws. */
export function toBlocks(stored: unknown): { type: string; data: Record<string, unknown> }[] {
  let doc: unknown = stored;
  if (typeof stored === 'string') {
    try {
      doc = JSON.parse(stored);
    } catch {
      return stored.trim() ? [{ type: 'paragraph', data: { text: stored } }] : [];
    }
  }
  const blocks = (doc as { blocks?: unknown } | null)?.blocks;
  return Array.isArray(blocks) ? blocks as { type: string; data: Record<string, unknown> }[] : [];
}

// ─── the actual request handler, shared end to end ───

/**
 * Runs the full "/ai-*" note-generation request: auth, rate limit, Pro gate, parse body, resolve
 * context (via the caller's own `resolveContext`, the one thing that's actually specific to each
 * function), build the prompt, call the provider, validate + return blocks. Every one of
 * ai-note/ai-field-group-note/ai-checklist-record-note's own `index.ts` is just this call plus
 * its own `resolveContext`.
 *
 * `resolveContext` gets the caller's own RLS-scoped `db` (never service-role) + `userId` — never
 * client-sent text. `ai-note` itself passes a resolver that always returns empty strings; that's
 * the whole reason this exists as a parameter rather than being resolved inline here.
 */
export async function runNoteGeneration(
  req: Request,
  resolveContext: (
    params: Record<string, unknown>,
    db: SupabaseClient,
    userId: string,
  ) => Promise<{ before: string; after: string }>,
  logLabel: string,
): Promise<Response> {
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
    const prompt = reqStr(params, 'prompt', 500);
    const options = sanitizeOptions(params.options);
    const { before, after } = await resolveContext(params, auth.supabase, auth.user.id);
    built = buildNotePrompt(prompt, options, before, after);
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  try {
    const text = await callProvider(built.system, built.messages, built.maxTokens);
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFences(text));
    } catch (parseErr) {
      // Almost always the response got cut off mid-string by `maxTokens`, not genuinely
      // malformed JSON — a raw "Unterminated string in JSON at position…" means nothing to the
      // composer's user-facing error text, so surface something actionable instead.
      console.error(`[${logLabel}] JSON.parse failed`, parseErr, text.slice(-200));
      throw new Error("That note came out too long and got cut off — try a shorter prompt or fewer options, then try again.");
    }
    const p = (parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {});
    return jsonResponse(200, { blocks: validateBlocks(p.blocks) });
  } catch (err) {
    console.error(`[${logLabel}]`, err);
    return jsonResponse(502, { error: (err as Error).message || 'AI provider error.' });
  }
}
