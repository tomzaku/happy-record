// A real Editor.js block tool (not a page-level modal) — typing "/" then "ai" at the start of an
// empty block filters Editor.js's own toolbox down to "AI Write" (its `toolbox.title` below),
// same as any other block type. Selecting it renders an inline composer in place; on submit, the
// generated blocks replace this placeholder block in the document.
//
// This package has no dependency on @dreamer/global or the network (see its own package.json) —
// the actual AI call, block-shape mapping, and Pro check all live in
// packages/global/src/hook/useAiNoteGenerate.ts (and useNoteById.ts, for a host page that knows
// which persisted note it's writing into) and get threaded in as
// `config.generate`/`config.isPro`, via NoteEditor's own `ai` prop (see index.tsx and
// EditorJs.tsx). A page that never passes `ai` never registers this tool at all — every other
// consumer of NoteEditor is unaffected.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { API, BlockAPI, BlockToolConstructorOptions, OutputBlockData } from '@editorjs/editorjs';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import styles from './AiWriteTool.module.scss';

export type AiNoteBlockOption = 'video' | 'quote' | 'checklist' | 'list';

/** Already Editor.js-shaped ({type, data}) — the tool never learns the AI's own response schema,
 * only the block data it's ready to insert. See packages/global's lib/editorJsNoteBlocks.ts for
 * where that mapping actually happens. */
export type AiNoteToolBlock = { type: string; data: Record<string, unknown> };

export type AiNoteToolOption = { key: AiNoteBlockOption; label: string };

export type AiNoteToolConfig = {
  /** Read live at render time (via a mutable ref the host keeps current), not captured once —
   * Editor.js constructs a tool instance exactly once, the moment its block is created, so a
   * value that resolves asynchronously afterward (e.g. useIsPro's own fetch, still loading when
   * the user opens "/ai" a beat after mount) needs a live read, not a snapshot. See EditorJs.tsx's
   * own `aiConfigRef`. */
  isPro: boolean;
  /** Which optional block-type toggles the composer offers, beyond the always-available heading
   * and paragraph. Defaults to all four supported ones if omitted/empty. */
  options?: AiNoteToolOption[];
  /** Runs the actual generation. `context.blockIndex` is this placeholder's own index among the
   * document's blocks — not content, just a position. The host page's own generate function
   * (useAiNoteGenerate.ts, or useNoteById.ts's own position-aware one) decides what to do with
   * it: the plain one ignores it entirely, the position-aware one sends it to the edge function
   * alongside whichever note this editor instance is writing into, which resolves the real
   * surrounding text itself server-side — this tool never learns or sends any note content, only
   * this number. A thrown error's `message` is shown inline; there's no local fallback for "the
   * AI didn't run" (see aiNoteApi.ts). */
  generate: (
    prompt: string,
    options: AiNoteBlockOption[],
    context: { blockIndex: number },
  ) => Promise<AiNoteToolBlock[]>;
  /** Optional: lets the host page send a non-Pro user somewhere (a paywall screen). Omitted →
   * the upsell state just has no action to offer. */
  onUpsell?: () => void;
};

/** What actually reaches the Tool via `config` — not the plain `AiNoteToolConfig` a page passes
 * to NoteEditor's `ai` prop. `isPro` (from useIsPro) commonly resolves *after* this Editor.js
 * instance is already constructed, and a Tool is only constructed once, the moment its block is
 * created — a plain object (even one with live getters) can't make an already-mounted React tree
 * re-render just because a ref changed underneath it. This is the standard external-store bridge
 * (`useSyncExternalStore`) instead: EditorJs.tsx's `subscribe` fires whenever the `ai` prop
 * changes, and `getSnapshot` reads the live value — see Composer's own use of it below. */
export type AiNoteToolLiveConfig = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => AiNoteToolConfig;
};

export const DEFAULT_CONFIG: AiNoteToolConfig = { isPro: false, generate: async () => [] };

const DEFAULT_OPTIONS: AiNoteToolOption[] = [
  { key: 'video', label: 'Embedded video' },
  { key: 'quote', label: 'Quote' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'list', label: 'Bulleted / numbered list' },
];

// Monochrome, matches the size/weight Editor.js's own toolbox icons use (~20px, currentColor).
const SPARKLE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L13.8 9.2L20 11L13.8 12.8L12 19L10.2 12.8L4 11L10.2 9.2L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M19 15.5L19.6 17.4L21.5 18L19.6 18.6L19 20.5L18.4 18.6L16.5 18L18.4 17.4L19 15.5Z" fill="currentColor"/></svg>`;

type Phase = 'prompt' | 'loading';

function Composer({
  live,
  getBlockIndex,
  onSubmit,
  onCancel,
}: {
  live: AiNoteToolLiveConfig;
  /** This placeholder's own index among the document's blocks, read fresh at generate-time (not
   * once at mount — the index can shift if the user keeps editing elsewhere in the note before
   * hitting Generate here). */
  getBlockIndex: () => number;
  onSubmit: (blocks: AiNoteToolBlock[]) => void;
  onCancel: () => void;
}) {
  // Reactive, unlike a plain ref read — this re-renders Composer itself the moment isPro (or
  // anything else in `ai`) actually changes, including while the non-Pro upsell below is the
  // only thing on screen (nothing there causes a normal React re-render on its own).
  const config = React.useSyncExternalStore(live.subscribe, live.getSnapshot);
  const options = config.options?.length ? config.options : DEFAULT_OPTIONS;
  const [prompt, setPrompt] = React.useState('');
  const [selected, setSelected] = React.useState<Set<AiNoteBlockOption>>(
    () => new Set(options.map(o => o.key)),
  );
  const [phase, setPhase] = React.useState<Phase>('prompt');
  const [error, setError] = React.useState('');

  const toggleOption = (key: AiNoteBlockOption) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || phase === 'loading') return;
    setPhase('loading');
    setError('');
    try {
      const blocks = await config.generate(prompt.trim(), Array.from(selected), { blockIndex: getBlockIndex() });
      onSubmit(blocks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't generate that — try again.");
      setPhase('prompt');
    }
  };

  // Editor.js's own BlockEvents listens for keydown on the whole redactor, not just its own
  // contentEditable elements — Backspace/Delete/Enter inside our real <textarea>/<input> here
  // still bubble up to it otherwise, and it acts on whatever block/selection *it* thinks is
  // current (usually the previous block), deleting text there instead of in this composer.
  // Stopping propagation at the card root — one listener via bubbling, not one per field — keeps
  // every keystroke typed in here from ever reaching Editor.js. `contentEditable={false}` on the
  // same root separately keeps Editor.js's caret/selection handling off the card's own (non-input)
  // markup.
  const stopKeyEvent = (e: React.KeyboardEvent) => e.stopPropagation();

  if (!config.isPro) {
    return (
      <div className={styles.card} contentEditable={false} onKeyDown={stopKeyEvent} onKeyUp={stopKeyEvent}>
        <div className={styles.header}>
          <Icon width={16} icon="solar:magic-stick-3-bold-duotone" className={styles.headerIcon} />
          <Typography.Text className={styles.headerTitle}>AI Write is a Pro feature</Typography.Text>
        </div>
        <Typography.Text className={styles.description}>
          Upgrade to Pro to write notes from a plain-text prompt — headings, quotes, checklists,
          lists, and embedded video included.
        </Typography.Text>
        <div className={styles.footer}>
          <Button type="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          {config.onUpsell && (
            <Button size="sm" onClick={config.onUpsell}>Upgrade</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card} contentEditable={false} onKeyDown={stopKeyEvent} onKeyUp={stopKeyEvent}>
      <div className={styles.header}>
        <Icon width={16} icon="solar:magic-stick-3-bold-duotone" className={styles.headerIcon} />
        <Typography.Text className={styles.headerTitle}>Write with AI</Typography.Text>
      </div>
      <textarea
        className={styles.promptInput}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="What do you want to write about?"
        rows={3}
        disabled={phase === 'loading'}
        autoFocus
      />
      <div className={styles.options}>
        {options.map(option => (
          <label key={option.key} className={styles.optionRow}>
            <Checkbox
              checked={selected.has(option.key)}
              onChange={() => toggleOption(option.key)}
              disabled={phase === 'loading'}
            />
            <Typography.Text className={styles.optionLabel}>{option.label}</Typography.Text>
          </label>
        ))}
      </div>
      {phase === 'loading' && (
        <div className={styles.loadingRow}>
          <Icon width={16} icon="svg-spinners:180-ring" />
          <Typography.Text className={styles.loadingText}>Writing…</Typography.Text>
        </div>
      )}
      {error && <Typography.Text className={styles.errorText}>{error}</Typography.Text>}
      <div className={styles.footer}>
        <Button type="ghost" size="sm" onClick={onCancel} disabled={phase === 'loading'}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleGenerate} disabled={!prompt.trim() || phase === 'loading'}>
          {phase === 'loading' ? 'Writing…' : 'Generate'}
        </Button>
      </div>
    </div>
  );
}

const NEVER_NOTIFIES: AiNoteToolLiveConfig = { subscribe: () => () => {}, getSnapshot: () => DEFAULT_CONFIG };

/** Editor.js Block Tool — see https://editorjs.io/tools-api for the interface this implements.
 * Registered under the key `aiWrite` only when a consumer passes NoteEditor's `ai` prop (see
 * EditorJs.tsx); `config` comes through here exactly as built in `tools.aiWrite.config` — the
 * subscribe/getSnapshot bridge described on AiNoteToolLiveConfig above, not the plain
 * AiNoteToolConfig a page passes to NoteEditor. */
export default class AiWriteTool {
  static get toolbox() {
    return { title: 'AI Write', icon: SPARKLE_ICON };
  }

  // Must be `true`, not just "this tool happens to be usable while read-only" (it isn't — the
  // toolbox that offers "/ai" is already hidden by Editor.js itself whenever readOnly is on, so
  // this block type is never reachable then anyway). Editor.js checks this at *construction*
  // time: if the editor starts in read-only mode (every note here does, until its own Edit
  // toggle flips readOnly off — see ChecklistFieldGroupView, note-detail's per-note edit, etc.)
  // and ANY registered tool reports `false` here, it throws a critical error and the whole editor
  // fails to mount — not just this tool. That's what broke viewing/editing every note once `ai`
  // was wired into those read-by-default editors.
  static get isReadOnlySupported() {
    return true;
  }

  private api: API;
  private block: BlockAPI;
  private live: AiNoteToolLiveConfig;
  private wrapper: HTMLElement;
  private root: Root | null = null;

  constructor({ api, config, block }: BlockToolConstructorOptions<Record<string, never>, AiNoteToolLiveConfig>) {
    this.api = api;
    this.block = block;
    this.live = config ?? NEVER_NOTIFIES;
    this.wrapper = document.createElement('div');
  }

  render(): HTMLElement {
    this.root = createRoot(this.wrapper);
    this.root.render(
      <Composer
        live={this.live}
        getBlockIndex={() => this.getBlockIndex()}
        onSubmit={blocks => this.applyBlocks(blocks)}
        onCancel={() => this.removeSelf()}
      />,
    );
    return this.wrapper;
  }

  /** This placeholder's own position among the document's blocks — the actual note content
   * around it, if any is needed at all, is resolved server-side (see useNoteById.ts and
   * ai-note/index.ts), scoped to whichever persisted note this editor instance is writing into.
   * This tool sends only this
   * index, never block content. */
  private getBlockIndex(): number {
    return this.api.blocks.getBlockIndex(this.block.id);
  }

  /** Inserts the generated blocks in this placeholder's place, then removes the placeholder
   * itself — `insertMany` shifts this block forward by the inserted count, so it's always at
   * `index + blocks.length` right after. Editor.js's own `onChange` config callback fires for
   * API-driven block mutations same as user-driven ones, so the host's `setValue` picks this up
   * without any extra wiring here. */
  private applyBlocks(blocks: AiNoteToolBlock[]) {
    const index = this.api.blocks.getBlockIndex(this.block.id);
    if (blocks.length === 0) {
      this.removeSelf();
      return;
    }
    this.api.blocks.insertMany(blocks as OutputBlockData[], index);
    this.api.blocks.delete(index + blocks.length);
  }

  private removeSelf() {
    this.api.blocks.delete(this.api.blocks.getBlockIndex(this.block.id));
  }

  /** This block is always replaced or removed before the user leaves it (see applyBlocks/
   * removeSelf) — a real save only matters if Editor.js's own saver runs while the composer is
   * still open (e.g. a consumer autosaving on an unrelated block's change), so an empty payload
   * is the correct "nothing to persist yet" answer. */
  save() {
    return {};
  }

  destroy() {
    this.root?.unmount();
    this.root = null;
  }
}
