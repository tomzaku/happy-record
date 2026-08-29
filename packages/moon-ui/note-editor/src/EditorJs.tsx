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
// import Code from "@editorjs/code";
import styles from './EditorJs.module.scss';
import editorjsCodecup from '@calumk/editorjs-codecup';
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


    const editor = new EditorJS({
      holder: holderRef.current,
      readOnly,
      placeholder: "Start writing your note...",
      onChange(api) {
        if (setValue) {
          api.saver.save().then((outputData) => {
            setValue(outputData);
          });
        }
      },
      data: (value || initialData as any),
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: "Enter a header",
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2
          }
        } as any,
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
        checklist: {
          class: Checklist,
          inlineToolbar: true
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
          class: editorjsCodecup
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
