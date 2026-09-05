import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import EditorJS from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Quote from "@editorjs/quote";
import Checklist from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import Table from "@editorjs/table";
import SimpleImage from "@editorjs/simple-image";
import Embed from "@editorjs/embed";
import Marker from "@editorjs/marker";
import Underline from "@editorjs/underline";
import InlineCode from "@editorjs/inline-code";
// import Code from "@editorjs/code";
import styles from './EditorJs.module.scss';
import editorjsCodecup from '@calumk/editorjs-codecup';
import Undo from 'editorjs-undo';
import DragDrop from 'editorjs-drag-drop';
import cx from 'classnames';
import AiWriteTool, { DEFAULT_CONFIG, type AiNoteToolConfig } from './AiWriteTool';


interface NoteEditorProps {
  initialData?: any;
  setValue?: (value: any) => void;
  value?: any;
  readOnly?: boolean;
  classes?: {
    container?: string;
  };
  /** Opt-in: wires up the "/ai" block tool (see AiWriteTool.tsx) when present, absent otherwise
   * — every other NoteEditor consumer is unaffected. Editor.js only constructs its tools once, at
   * mount, but `isPro`/`generate` can come from a hook whose own state resolves later
   * (useAiNoteGenerate's `isPro`, often still loading at that exact moment) — bridged to the
   * already-mounted tool via `aiConfigRef` + `aiListenersRef` below (a `useSyncExternalStore`
   * source), not just captured once. */
  ai?: AiNoteToolConfig;
}

export interface NoteEditorHandle {
  /** The editor's own real current content, read directly from Editor.js — not whatever
   * `setValue` last reported. `onChange` (below) is debounced internally by Editor.js itself
   * (its own MutationObserver handler, not something this wrapper controls), so a caller that
   * needs the actual-right-now value for a one-shot action (e.g. "Submit" firing immediately
   * after the last keystroke) can't trust `setValue` having already fired — same "this tick, not
   * a later render" reasoning CLAUDE.md's own `getRecordFieldsByIds`/`getAllChecklistWithTemplate`
   * follow for the same class of problem. `undefined` if the editor hasn't finished mounting yet. */
  getValue: () => Promise<unknown | undefined>;
}

const EditorJs = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ initialData, setValue, value, classes, readOnly = false, ai }, ref) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const aiConfigRef = useRef<AiNoteToolConfig | undefined>(ai);
  // Who to notify when `ai` changes — see AiWriteTool.tsx's own AiNoteToolLiveConfig for why a
  // plain ref isn't enough: an already-mounted Composer (e.g. sitting on the non-Pro upsell,
  // opened before useIsPro's fetch resolved) has nothing that would otherwise make it re-render
  // once `ai.isPro` actually flips to true.
  const aiListenersRef = useRef<Set<() => void>>(new Set());
  useEffect(() => {
    aiConfigRef.current = ai;
    aiListenersRef.current.forEach(listener => listener());
  }, [ai]);

  // Handle external value changes
  // useEffect(() => {
  //   if (editorRef.current && value) {
  //     editorRef.current.render(value);
  //   }
  // }, [value]);

  useEffect(() => {
    if (!holderRef.current) return;

    const initialContent = (value || initialData as any);

    const editor = new EditorJS({
      holder: holderRef.current,
      readOnly,
      placeholder: "Start writing your note...",
      // EditorJS has no undo/redo of its own — native browser undo only ever tracked plain
      // typing, so a paste/cut (which EditorJS rewrites via its own sanitizer/block APIs, not a
      // DOM mutation the browser's own undo manager sees) silently didn't revert on ctrl+Z.
      // editorjs-undo tracks changes through the editor's own API instead, so it also catches
      // paste/cut. `initialize` seeds its stack with whatever's already loaded — without it, the
      // first undo would clear a pre-existing note back to empty.
      onReady() {
        const undo = new (Undo as any)({ editor });
        if (initialContent) {
          undo.initialize(initialContent);
        }
        new (DragDrop as any)(editor);
      },
      onChange(api) {
        if (setValue) {
          api.saver.save().then((outputData) => {
            setValue(outputData);
          });
        }
      },
      data: initialContent,
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: "Enter a header",
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2
          }
        } as any,
        marker: {
          class: Marker,
          shortcut: 'CMD+SHIFT+M'
        },
        underline: {
          class: Underline,
          shortcut: 'CMD+U'
        },
        inlineCode: {
          class: InlineCode,
          shortcut: 'CMD+SHIFT+C'
        },
        list: {
          class: List,
          inlineToolbar: true,
          config: {
            defaultStyle: "unordered"
          }
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: "Enter a quote",
            captionPlaceholder: "Quote's author"
          }
        },
        // @editorjs/list 2.x's own toolbox already includes a "Checklist" entry (`style:
        // 'checklist'`), alongside Unordered/Ordered List — registering this older, separate
        // @editorjs/checklist tool too was giving the "+" menu two "Checklist" entries. This tool
        // still has to stay registered (`toolbox: false` only hides its own menu entry, it
        // doesn't unregister it) — it's the tool that renders any block whose type is
        // `'checklist'`, which is still a live shape, not just legacy data: AI-generated notes
        // (packages/global/src/lib/editorJsNoteBlocks.ts, used by useAiNoteGenerate and
        // useApplyAiChecklistTemplate) build fresh blocks in exactly this tool's `{ items: [{
        // text, checked }] }` shape today. A user manually adding a checklist now goes through
        // the `list` tool's own Checklist variant instead — it also supports nesting, which this
        // one never did.
        checklist: {
          class: Checklist,
          inlineToolbar: true,
          toolbox: false
        },
        delimiter: Delimiter,
        table: {
          class: Table,
          inlineToolbar: true
        } as any,
        simpleImage: {
          class: SimpleImage
        },
        code: {
          class: editorjsCodecup,
          // Overrides CodeCup's own default toolbox entry (icon + "CodeCup" title) — this is the
          // same stroke="currentColor" 24x24 icon @editorjs/code uses, matching the monochrome
          // style of the other toolbox icons here so it themes correctly in dark mode too.
          toolbox: {
            title: 'Code',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 8L5 12L9 16"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 8L19 12L15 16"/></svg>',
          },
        },
        embed: {
          class: Embed,
          inlineToolbar: true,
          config: {
            services: {
              youtube: true,
              coub: true,
              codepen: true,
              vimeo: true
            }
          }
        } as any,
        // Only registered when a consumer opts in (see NoteEditorProps.ai above) — `ai` here is
        // this effect's captured-at-mount value (whether the prop was passed at all). The
        // subscribe/getSnapshot pair below is what actually stays live afterward — see
        // AiNoteToolLiveConfig's own comment for why a plain ref/getter read isn't enough.
        ...(ai ? {
          aiWrite: {
            class: AiWriteTool,
            config: {
              subscribe: (onChange: () => void) => {
                aiListenersRef.current.add(onChange);
                return () => aiListenersRef.current.delete(onChange);
              },
              getSnapshot: () => aiConfigRef.current ?? DEFAULT_CONFIG,
            },
          } as any,
        } : {}),
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
    };
  }, []);

  // The constructor above only sets the *initial* readOnly state (its effect only runs once,
  // on mount) — flipping the `readOnly` prop afterward (a consumer's view/edit toggle) has to
  // go through Editor.js's own API on the already-mounted instance instead. `isReady` guards
  // against toggling before construction actually finishes.
  useEffect(() => {
    editorRef.current?.isReady.then(() => {
      editorRef.current?.readOnly.toggle(readOnly);
    });
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getValue: async () => {
      if (!editorRef.current) return undefined;
      await editorRef.current.isReady;
      return editorRef.current.save();
    },
  }));

  return (
    <div
      ref={holderRef}
      className={cx(styles.editorContent, classes?.container)}
    />
  );
  },
);

export default EditorJs;
