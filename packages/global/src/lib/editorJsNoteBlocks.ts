// Shared "AI proposed a short sequence of typed content blocks" → "real Editor.js block data"
// mapping. Two AI features build a note this way: ai-checklist-template (one short note per
// field group) and ai-note (a whole note, see useAiNoteGenerate.ts) — this is the one place that
// mapping lives, instead of each caller re-deriving it.
//
// `FieldGroup.note` / a note's `value` is Editor.js `OutputData`, NOT a Yoopta document — despite
// some call sites' own stale `as YooptaContentValue` casts suggesting otherwise. That cast is
// misleading: `@moon-ui/note-editor`'s actual default export (`index.tsx`) renders `EditorJs.tsx`
// (backed by `@editorjs/editorjs`) inside an error boundary — `YooptaEditor.tsx`, `LexicalEditor.tsx`
// and `BlockNote.tsx` in that same package are dead, unwired alternates. Confirmed empirically: a
// hand-built Yoopta document (matching `@yoopta/editor`'s own `Blocks.buildBlockData` shape
// byte-for-byte) still rendered as an empty "Start writing your note..." placeholder, while this
// shape renders the real text immediately.
//
// `packages/global` has no dependency on `@editorjs/editorjs`'s types, so each tool's block shape
// is reproduced structurally rather than imported:
//   - `header`'s data is `{ text, level }`
//   - `quote`'s is `{ text, caption, alignment }`
//   - `embed`'s (confirmed against @editorjs/embed's own source, since a hand-built block skips
//     the paste-detection flow that normally derives it) is
//     `{ service, source, embed, width, height, caption }` — `embed` is the actual iframe src,
//     `source` is the original watch URL kept only for display.
//   - `checklist`'s (@editorjs/checklist) is `{ items: [{ text, checked }] }`
//   - `list`'s (@editorjs/list 2.x, the installed version) is the *nested* shape —
//     `{ style, items: [{ content, meta: {}, items: [] }] }`, not the older flat string-array
//     shape a pre-2.0 version of this tool used.

export type AiGeneratedNoteBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; caption: string }
  | { type: 'video'; videoId: string; caption: string }
  | { type: 'checklist'; items: { text: string; checked: boolean }[] }
  | { type: 'list'; style: 'ordered' | 'unordered'; items: string[] };

export type EditorJsBlockInput = { type: string; data: Record<string, unknown> };

export function buildEditorJsBlocks(blocks: AiGeneratedNoteBlock[]): EditorJsBlockInput[] {
  return blocks.map((block): EditorJsBlockInput => {
    switch (block.type) {
      case 'heading':
        return { type: 'header', data: { text: block.text, level: 3 } };
      case 'quote':
        return {
          type: 'quote',
          data: { text: block.text, caption: block.caption, alignment: 'left' },
        };
      case 'video':
        return {
          type: 'embed',
          data: {
            service: 'youtube',
            source: `https://www.youtube.com/watch?v=${block.videoId}`,
            embed: `https://www.youtube.com/embed/${block.videoId}`,
            width: 580,
            height: 320,
            caption: block.caption,
          },
        };
      case 'checklist':
        return {
          type: 'checklist',
          data: { items: block.items.map(item => ({ text: item.text, checked: item.checked })) },
        };
      case 'list':
        return {
          type: 'list',
          data: {
            style: block.style,
            items: block.items.map(text => ({ content: text, meta: {}, items: [] })),
          },
        };
      case 'paragraph':
      default:
        return { type: 'paragraph', data: { text: block.text } };
    }
  });
}

/** An empty note stays `null`, same as a manually created group (see
 * ChecklistFieldGroupAddGroup's own `note: null`). */
export function buildEditorJsDocument(blocks: AiGeneratedNoteBlock[]): unknown | null {
  if (blocks.length === 0) return null;
  return { time: Date.now(), blocks: buildEditorJsBlocks(blocks), version: '2.31.6' };
}
