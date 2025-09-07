import { useEffect, useRef, useState } from "react";
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


interface NoteEditorProps {
  initialData?: Record<string, unknown>;
}

const EditorJs = ({ initialData, setValue, value }: NoteEditorProps) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!holderRef.current) return;


    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder: "Start writing your note...",
      onChange(api, event) {
        set
      },
      data: (initialData as any) || {
        blocks: [
          {
            type: "header",
            data: {
              text: "Welcome to Your Note Editor",
              level: 1
            }
          },
          {
            type: "paragraph",
            data: {
              text: "This is a powerful note editor with rich formatting options. Click the eye icon to preview your content."
            }
          }
        ]
      },
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: "Enter a header",
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2
          }
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
        checklist: {
          class: Checklist,
          inlineToolbar: true
        },
        delimiter: Delimiter,
        table: {
          class: Table as any,
          inlineToolbar: true
        },
        simpleImage: {
          class: SimpleImage as any
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
        }
      },
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      ref={holderRef}
      className={`${styles.editorContent}`}
    />
  );
};

export default EditorJs;
