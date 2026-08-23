import { useEffect, useRef } from "react";
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


interface NoteEditorProps {
  initialData?: any;
  setValue?: (value: any) => void;
  value?: any;
  readOnly?: boolean;
  classes?: {
    container?: string;
  };
}

const EditorJs = ({ initialData, setValue, value, classes, readOnly = false }: NoteEditorProps) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);

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
        } as any
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

  return (
    <div
      ref={holderRef}
      className={cx(styles.editorContent, classes?.container)}
    />
  );
};

export default EditorJs;
