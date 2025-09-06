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

interface NoteEditorProps {
  initialData?: any;
  onSave?: (data: any) => void;
}

const NoteEditor = ({ initialData, onSave }: NoteEditorProps) => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [viewData, setViewData] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (!holderRef.current) return;

    const editor = new EditorJS({
      holder: holderRef.current,
      placeholder: "Start writing your note...",
      data: initialData || {
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
          class: Table as unknown as any,
          inlineToolbar: true
        },
        simpleImage: {
          class: SimpleImage as unknown as any
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
      onReady: () => {
        setIsReady(true);
      }
    });

    editorRef.current = editor;

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
    };
  }, []);

  const handleModeToggle = async () => {
    setIsEditMode(!isEditMode);
  };

  const toggleTheme = () => {
    setIsDark((d) => !d);
  };

  const renderNestedList = (items: any[], style: "ordered" | "unordered") => {
    const ListTag = style === "ordered" ? "ol" : "ul";
    return (
      <ListTag className={`${style === "ordered" ? "list-decimal" : "list-disc"} ml-6`}>
        {items.map((item: any, idx: number) => (
          <li key={idx} className="mb-2">
            {typeof item === 'string' ? item : (item.content || '')}
            {item.items && item.items.length > 0 && renderNestedList(item.items, style)}
          </li>
        ))}
      </ListTag>
    );
  };

  const renderViewContent = (blocks: any[]) => {
    return blocks.map((block, index) => {
      switch (block.type) {
        case "header":
          const HeadingTag = `h${block.data.level}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag
              key={index}
              className={`font-bold mb-4 ${
                block.data.level === 1 ? "text-4xl" :
                block.data.level === 2 ? "text-3xl" :
                block.data.level === 3 ? "text-2xl" :
                block.data.level === 4 ? "text-xl" :
                block.data.level === 5 ? "text-lg" : "text-base"
              }`}
            >
              {block.data.text}
            </HeadingTag>
          );
        
        case "paragraph":
          return (
            <p key={index} className="mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: block.data.text }} />
          );
        
        case "list":
          return (
            <div key={index} className="mb-4">
              {renderNestedList(block.data.items, block.data.style)}
            </div>
          );
        
        case "quote":
          return (
            <blockquote key={index} className="border-l-4 border-primary pl-6 py-4 mb-4 bg-accent/30 rounded-r-lg">
              <p className="text-lg font-medium mb-2">{block.data.text}</p>
              {block.data.caption && (
                <cite className="text-sm text-muted-foreground">— {block.data.caption}</cite>
              )}
            </blockquote>
          );
        
        case "checklist":
          return (
            <div key={index} className="mb-4">
              {block.data.items.map((item: any, itemIndex: number) => (
                <div key={itemIndex} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className="mr-3 rounded"
                  />
                  <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          );
        
        case "delimiter":
          return <hr key={index} className="my-8 border-border" />;
        
        case "table":
          return (
            <div key={index} className="mb-4 overflow-x-auto">
              <table className="w-full border-collapse border border-border rounded-lg">
                <tbody>
                  {block.data.content.map((row: string[], rowIndex: number) => (
                    <tr key={rowIndex}>
                      {row.map((cell: string, cellIndex: number) => (
                        <td key={cellIndex} className="border border-border p-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        case "embed":
          return (
            <div key={index} className="my-6 aspect-video w-full overflow-hidden rounded-lg border border-border">
              {block.data?.embed ? (
                <iframe
                  src={block.data.embed}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={block.data?.service || "Embedded content"}
                />
              ) : block.data?.source ? (
                <a href={block.data.source} className="text-primary underline" target="_blank" rel="noreferrer">
                  {block.data.source}
                </a>
              ) : null}
            </div>
          );
        case "simpleImage":
          return (
            <figure key={index} className="my-6">
              {block.data?.url && (
                <img src={block.data.url} alt={block.data?.caption || "Embedded image"} className="max-w-full rounded-lg border border-border shadow-soft" />
              )}
              {block.data?.caption && (
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">{block.data.caption}</figcaption>
              )}
            </figure>
          );
        
        default:
          return null;
      }
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-primary rounded-xl shadow-soft">
          </div>
          <div>
            <h1 className="text-2xl font-bold">Note Editor</h1>
            <p className="text-muted-foreground">
              {isEditMode ? "Edit Mode" : "View Mode"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
        </div>
      </div>

      {/* Editor/View Container */}
        {isEditMode ? (
          <div
            ref={holderRef}
            className="prose prose-lg max-w-none"
          />
        ) : (
          <div className="prose prose-lg max-w-none">
            {viewData && viewData.blocks ? (
              renderViewContent(viewData.blocks)
            ) : (
              <p className="text-muted-foreground">No content to display</p>
            )}
          </div>
        )}
    </div>
  );
};

export default NoteEditor;
