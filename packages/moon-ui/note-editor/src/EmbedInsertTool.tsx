// A real Editor.js block tool (shows up in the "+" toolbox as "Embed") that solves the
// discoverability problem @editorjs/embed (registered as the `embed` tool in EditorJs.tsx) has on
// its own: that tool has no `toolbox` entry at all in this version, and no way to enter a URL
// manually once a block exists — it only ever activates by matching a *pasted* URL against its
// own regex patterns. This tool is the toolbox entry: it prompts for a URL, matches it against
// the exact same service patterns @editorjs/embed itself prepared (`Embed.services`/`Embed
// .patterns`, populated once by Editor.js calling `Embed.prepare({config})` when the `embed` tool
// is registered — see EditorJs.tsx), and on a match replaces itself with a real `embed`-type
// block carrying already-resolved data, same shape `Embed.prototype.onPaste` itself builds. On no
// match, it stays put with an inline error instead of silently doing nothing.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Embed from '@editorjs/embed';
import type { API, BlockAPI, BlockToolConstructorOptions } from '@editorjs/editorjs';
import Button from '@moon-ui/button';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import cx from 'classnames';
import styles from './EmbedInsertTool.module.scss';

// Monochrome, matches the size/weight Editor.js's own toolbox icons use (stroke=currentColor,
// same convention as the `code` tool's own overridden toolbox icon in EditorJs.tsx).
const EMBED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M10 9L14 12L10 15V9Z" fill="currentColor"/></svg>`;

type EmbedData = {
  service: string;
  source: string;
  embed: string;
  width?: number;
  height?: number;
};

/** One chip per service enabled in EditorJs.tsx's `embed` tool config — clicking a chip shows a
 * real example link matching that service's own regex (verified against `Embed.services[key]
 * .regex` by hand, not just plausible-looking), so a user unsure of the expected URL shape for,
 * say, Pinterest or Miro can check before pasting their own. `github` here is specifically a
 * *Gist* URL, not a repo link — see the conversation that led to this tool: a plain
 * github.com/user/repo link doesn't match any pattern this library ships, because GitHub has no
 * iframe-embeddable endpoint for a repo the way it does for a gist. Label says so explicitly so
 * that confusion doesn't repeat here.
 *
 * `icon` is an Iconify name (this app's `Icon` component, @moon-ui/icon, wraps @iconify/react).
 * Most are from the `logos` set — real, already-multicolor brand marks (verified present in this
 * repo's own node_modules/@iconify/json/json/logos.json, not just assumed to exist), so they need
 * no `color` override to look right. A few brands aren't in `logos` at all: `imgur`/`aparat` come
 * from `simple-icons` instead (monochrome, `currentColor`-based, hence the explicit `color` hex
 * below), and `coub` has no real brand mark in any bundled Iconify set at all — `arcticons:coub`
 * is a generic stand-in, not Coub's actual logo. `gfycat` has no icon anywhere in the bundle
 * (the service shut down in 2023) — falls back to a plain link glyph. `color` on every entry also
 * tints that chip's border when active, brand-accurate for the confident ones (YouTube red,
 * Facebook blue, etc.) and a best-effort guess for the four noted above. */
const SERVICE_EXAMPLES: { key: string; label: string; example: string; icon: string; color: string }[] = [
  { key: 'youtube', label: 'YouTube', example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', icon: 'logos:youtube-icon', color: '#FF0000' },
  { key: 'vimeo', label: 'Vimeo', example: 'https://vimeo.com/76979871', icon: 'logos:vimeo-icon', color: '#1AB7EA' },
  { key: 'twitter', label: 'Twitter/X', example: 'https://twitter.com/jack/status/20', icon: 'logos:twitter', color: '#1DA1F2' },
  { key: 'instagram', label: 'Instagram', example: 'https://www.instagram.com/p/Cxyz123AbCd/', icon: 'logos:instagram-icon', color: '#E1306C' },
  { key: 'facebook', label: 'Facebook', example: 'https://www.facebook.com/zuck/posts/10102577175875681', icon: 'logos:facebook', color: '#1877F2' },
  { key: 'reddit', label: 'Reddit', example: 'https://www.reddit.com/r/programming/comments/abc123/example_post/', icon: 'logos:reddit-icon', color: '#FF4500' },
  { key: 'pinterest', label: 'Pinterest', example: 'https://www.pinterest.com/pin/99360735500167749/', icon: 'logos:pinterest', color: '#E60023' },
  { key: 'codepen', label: 'CodePen', example: 'https://codepen.io/team/pen/PNaGbb', icon: 'logos:codepen-icon', color: '#000000' },
  { key: 'github', label: 'GitHub Gist', example: 'https://gist.github.com/octocat/6cad326836d38bd3a7ae', icon: 'logos:github-icon', color: '#181717' },
  // Best-effort brand colors/icons — see the doc comment above for why these four are lower
  // confidence than the rest.
  { key: 'coub', label: 'Coub', example: 'https://coub.com/view/o7pjs', icon: 'arcticons:coub', color: '#6633CC' },
  { key: 'gfycat', label: 'Gfycat', example: 'https://gfycat.com/DazzlingWindyAnhinga', icon: 'mdi:link-variant', color: '#8A8F98' },
  { key: 'imgur', label: 'Imgur', example: 'https://imgur.com/gallery/dfHK1', icon: 'simple-icons:imgur', color: '#1BB76E' },
  { key: 'vine', label: 'Vine', example: 'https://vine.co/v/hzB9r0J1qOB', icon: 'logos:vine', color: '#00B489' },
  { key: 'aparat', label: 'Aparat', example: 'https://www.aparat.com/v/wD8i9', icon: 'simple-icons:aparat', color: '#DA2E2E' },
  { key: 'miro', label: 'Miro', example: 'https://miro.com/app/board/o9J_lTvyOWo=/', icon: 'logos:miro', color: '#050038' },
];

/** Replicates `Embed.prototype.onPaste`'s own url → EmbedData resolution (see embed.mjs) — this
 * tool never gets a paste event to hand Editor.js, so it has to do that match itself, against the
 * exact same `Embed.services` @editorjs/embed prepared from the `services` config in
 * EditorJs.tsx. Returns `null` if nothing matches. */
function matchEmbedService(url: string): EmbedData | null {
  for (const [service, config] of Object.entries(Embed.services ?? {})) {
    const match = config.regex.exec(url);
    if (!match) continue;
    const groups = match.slice(1);
    const remoteId = (config.id ?? (ids => ids.shift() || ''))(groups);
    return {
      service,
      source: url,
      embed: config.embedUrl.replace(/<%= remote_id %>/g, remoteId),
      width: config.width,
      height: config.height,
    };
  }
  return null;
}

function Composer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: EmbedData) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = React.useState('');
  const [error, setError] = React.useState('');
  // YouTube shown by default — the composer opens with a visible example immediately, rather
  // than requiring a click before showing any format at all.
  const [exampleFor, setExampleFor] = React.useState<string | null>('youtube');

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const data = matchEmbedService(trimmed);
    if (!data) {
      setError("Couldn't recognize that link — try a YouTube, Vimeo, Twitter, Instagram, or other supported link.");
      return;
    }
    onSubmit(data);
  };

  // Same reasoning as AiWriteTool's Composer: Editor.js's own BlockEvents listens for keydown on
  // the whole redactor, not just its own contentEditable elements, so Enter/Backspace typed into
  // this real <input> would otherwise bubble up and be treated as if it happened in whichever
  // block Editor.js currently thinks is selected.
  const stopKeyEvent = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.card} contentEditable={false} onKeyDown={stopKeyEvent} onKeyUp={stopKeyEvent}>
      <div className={styles.header}>
        <Typography.Text className={styles.headerTitle}>Embed a link</Typography.Text>
      </div>
      <div className={styles.serviceChips}>
        {SERVICE_EXAMPLES.map(service => (
          <button
            key={service.key}
            type="button"
            className={cx(styles.serviceChip, exampleFor === service.key && styles.serviceChipActive)}
            // Border tint only on the active chip — every chip showing its brand color at rest
            // read as a rainbow strip rather than a toolbar. `undefined` (not the color) when
            // inactive falls back to the plain neutral border in the SCSS.
            style={exampleFor === service.key ? { borderColor: service.color } : undefined}
            onClick={() => setExampleFor(prev => prev === service.key ? null : service.key)}
          >
            <Icon icon={service.icon} width={16} color={service.color} />
            {service.label}
          </button>
        ))}
      </div>
      {exampleFor && (
        <Typography.Text className={styles.exampleText}>
          Example: <code>{SERVICE_EXAMPLES.find(s => s.key === exampleFor)?.example}</code>
        </Typography.Text>
      )}
      <input
        className={styles.urlInput}
        type="url"
        value={url}
        onChange={e => { setUrl(e.target.value); setError(''); }}
        placeholder="Paste a YouTube, Vimeo, Twitter, or other link"
        autoFocus
      />
      {error && <Typography.Text className={styles.errorText}>{error}</Typography.Text>}
      <div className={styles.footer}>
        <Button type="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!url.trim()}>Embed</Button>
      </div>
    </div>
  );
}

/** Editor.js Block Tool — see https://editorjs.io/tools-api. Registered under `embedInsert` in
 * EditorJs.tsx, separate from the real `embed` key so it can't collide with @editorjs/embed's own
 * paste-driven registration. */
export default class EmbedInsertTool {
  static get toolbox() {
    return { title: 'Embed', icon: EMBED_ICON };
  }

  // Must be `true` — see AiWriteTool.tsx's own identical comment: Editor.js checks this at
  // construction time for *every* registered tool, and a read-only editor (every note here starts
  // read-only until its own Edit toggle flips it off) throws a critical error and fails to mount
  // entirely if any one tool reports `false`.
  static get isReadOnlySupported() {
    return true;
  }

  private api: API;
  private block: BlockAPI;
  private wrapper: HTMLElement;
  private root: Root | null = null;

  constructor({ api, block }: BlockToolConstructorOptions<Record<string, never>, Record<string, never>>) {
    this.api = api;
    this.block = block;
    this.wrapper = document.createElement('div');
  }

  render(): HTMLElement {
    this.root = createRoot(this.wrapper);
    this.root.render(
      <Composer
        onSubmit={data => this.applyEmbed(data)}
        onCancel={() => this.removeSelf()}
      />,
    );
    return this.wrapper;
  }

  /** Replaces this placeholder in place with a real `embed` block carrying already-resolved data
   * — `replace: true` (Editor.js's `blocks.insert` 6th arg) swaps the block at this index directly,
   * no separate delete-self call needed. */
  private applyEmbed(data: EmbedData) {
    const index = this.api.blocks.getBlockIndex(this.block.id);
    this.api.blocks.insert('embed', data, {}, index, true, true);
  }

  private removeSelf() {
    this.api.blocks.delete(this.api.blocks.getBlockIndex(this.block.id));
  }

  /** Always replaced or removed before the user leaves it (see applyEmbed/removeSelf) — matches
   * AiWriteTool.tsx's own save(): an empty payload is the correct answer if Editor.js's saver
   * somehow runs while this composer is still open. */
  save() {
    return {};
  }

  destroy() {
    this.root?.unmount();
    this.root = null;
  }
}
