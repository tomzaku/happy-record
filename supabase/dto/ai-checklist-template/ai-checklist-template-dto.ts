// The shape of a `GeneratedTemplate` — types plus the validation that turns the AI provider's raw
// JSON into something safe to hand back to the client, same "never trust the model's own output
// shape" role `fromX` validation plays for a real table row elsewhere in this app.

// Mirrors RecordField.type (packages/global/src/store/record-field/useRecordField.tsx) — every
// type a real field can be, not just the two this used to be limited to. 'metric' was renamed
// 'number' in 20260829080000_field_type_metric_to_number.sql; nothing here ever dealt with that
// old name. 'select'/'multiselect' added in 20260829110000_field_types_select.sql.
export type FieldType = 'number' | 'note' | 'text' | 'date' | 'datetime' | 'select' | 'multiselect';
export const FIELD_TYPES: readonly FieldType[] = ['number', 'note', 'text', 'date', 'datetime', 'select', 'multiselect'];
export const isFieldType = (v: unknown): v is FieldType => FIELD_TYPES.includes(v as FieldType);
export const SELECT_FIELD_TYPES = new Set<FieldType>(['select', 'multiselect']);

export interface AvailableField {
  title: string;
  icon: string;
  type: FieldType;
  unit: string;
  // select/multiselect-only — see GeneratedField.options' own comment.
  options?: string[];
}

export interface GeneratedField {
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
  // shared/fields.ts's own validation) — the fixed list of choices this field offers.
  options?: string[];
}

// The note editor (@moon-ui/note-editor, backed by @editorjs/editorjs) supports far more than a
// paragraph of text — headings, quotes, and a YouTube embed among them. A generated group's note
// is a short sequence of typed blocks so the client can build a real Editor.js document instead
// of always wrapping plain text in a single paragraph (see useApplyAiChecklistTemplate.ts's
// buildNoteFromBlocks, which does that mapping).
export type GeneratedNoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; caption: string }
  | { type: 'video'; videoId: string; caption: string };

export interface GeneratedGroup {
  title: string;
  note: GeneratedNoteBlock[];
  repeat: { hour: string; minute: string; dayOfWeek: string } | null;
  fields: GeneratedField[];
}

export interface GeneratedTemplate {
  title: string;
  avatar: { name: string; color: string };
  tags: string[];
  fieldGroups: GeneratedGroup[];
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

export function validate(parsed: unknown): GeneratedTemplate {
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
        // A select/multiselect field genuinely needs real options — shared/fields.ts's own
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
