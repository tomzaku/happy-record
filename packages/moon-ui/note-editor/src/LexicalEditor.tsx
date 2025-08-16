import React, { useEffect, useMemo, useState } from 'react';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  EditorState,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  TextFormatType,
  ElementFormatType,
} from 'lexical';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button';
import cx from 'classnames';
import styles from './index.module.scss';

type Props = {
  value: string;
  setValue: (value: string) => void;
  readOnly?: boolean;
  classes?: {
    container?: string;
  };
  key?: string | number;
};

// Enhanced toolbar component
function ToolbarPlugin({ readOnly }: { readOnly?: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [fontSize, setFontSize] = useState(15);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatElement = (format: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, format);
  };

  const undo = () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  };

  const redo = () => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      // @ts-expect-error - Lexical command types are complex
      editor.dispatchCommand('TOGGLE_LINK', url);
    }
  };

  const insertCode = () => {
    // For now, we'll use a simple approach - insert code formatting
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code' as TextFormatType);
  };

  const changeHeading = (headingType: string) => {
    // For now, we'll use a simple approach that works with Lexical
    if (headingType === 'normal') {
      // Convert to paragraph - use left alignment as default
      editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left' as ElementFormatType);
    } else {
      // For headings, we'll need to implement proper Lexical heading commands
      // This is a placeholder - would need custom Lexical commands
      console.log('Heading change to:', headingType);
    }
  };

  const changeFontFamily = (fontFamily: string) => {
    // For now, we'll just log the change
    // Font family changes would need custom Lexical commands or CSS classes
    console.log('Font family change to:', fontFamily);
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(8, Math.min(72, fontSize + delta));
    setFontSize(newSize);
    
    // For now, we'll just log the change
    // Font size changes would need custom Lexical commands or CSS classes
    console.log('Font size change to:', newSize);
  };

  const changeTextColor = (color: string) => {
    setTextColor(color);
    
    // For now, we'll just log the change
    // Color changes would need custom Lexical commands or CSS classes
    console.log('Text color change to:', color);
  };

  const changeHighlightColor = (color: string) => {
    setHighlightColor(color);
    
    // For now, we'll just log the change
    // Highlight changes would need custom Lexical commands or CSS classes
    console.log('Highlight color change to:', color);
  };

  if (readOnly) return null;

  return (
    <div className={styles.toolbar}>
      {/* Undo/Redo */}
      <button onClick={undo} className={styles.toolbarButton} title="Undo">
        <Icon icon="mdi:undo" width={16} height={16} />
      </button>
      <button onClick={redo} className={styles.toolbarButton} title="Redo">
        <Icon icon="mdi:redo" width={16} height={16} />
      </button>

      <div className={styles.divider} />

      {/* Paragraph Style */}
      <select 
        className={styles.select} 
        defaultValue="normal"
        onChange={(e) => changeHeading(e.target.value)}
      >
        <option value="normal">Normal</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="h4">Heading 4</option>
        <option value="h5">Heading 5</option>
        <option value="h6">Heading 6</option>
      </select>

      {/* Font Family */}
      <select 
        className={styles.select} 
        defaultValue="arial"
        onChange={(e) => changeFontFamily(e.target.value)}
      >
        <option value="arial">Arial</option>
        <option value="times">Times New Roman</option>
        <option value="courier">Courier New</option>
        <option value="georgia">Georgia</option>
        <option value="verdana">Verdana</option>
      </select>

      {/* Font Size */}
      <button
        onClick={() => changeFontSize(-1)}
        className={styles.toolbarButton}
        title="Decrease font size"
      >
        <Icon icon="mdi:minus" width={16} height={16} />
      </button>
      <input
        type="number"
        value={fontSize}
        onChange={e => {
          const newSize = Number(e.target.value);
          setFontSize(newSize);
          changeFontSize(newSize - fontSize); // Apply the change
        }}
        className={styles.fontSizeInput}
        min="8"
        max="72"
      />
      <button
        onClick={() => changeFontSize(1)}
        className={styles.toolbarButton}
        title="Increase font size"
      >
        <Icon icon="mdi:plus" width={16} height={16} />
      </button>

      <div className={styles.divider} />

      {/* Text Formatting */}
      <button
        onClick={() => formatText('bold' as TextFormatType)}
        className={styles.toolbarButton}
        title="Bold"
      >
        <Icon icon="mdi:format-bold" width={16} height={16} />
      </button>
      <button
        onClick={() => formatText('italic' as TextFormatType)}
        className={styles.toolbarButton}
        title="Italic"
      >
        <Icon icon="mdi:format-italic" width={16} height={16} />
      </button>
      <button
        onClick={() => formatText('underline' as TextFormatType)}
        className={styles.toolbarButton}
        title="Underline"
      >
        <Icon icon="mdi:format-underline" width={16} height={16} />
      </button>

      <div className={styles.divider} />

      {/* Code */}
      <button
        onClick={insertCode}
        className={styles.toolbarButton}
        title="Insert code"
      >
        <Icon icon="mdi:code-tags" width={16} height={16} />
      </button>

      {/* Link */}
      <button
        onClick={insertLink}
        className={styles.toolbarButton}
        title="Insert link"
      >
        <Icon icon="mdi:link" width={16} height={16} />
      </button>

      <div className={styles.divider} />

      {/* Text Color */}
      <div className={styles.colorPickerContainer}>
        <button className={styles.toolbarButton} title="Text color">
          <Icon icon="mdi:format-color-text" width={16} height={16} />
        </button>
        <input
          type="color"
          value={textColor}
          onChange={e => changeTextColor(e.target.value)}
          className={styles.colorPicker}
        />
      </div>

      {/* Highlight Color */}
      <div className={styles.colorPickerContainer}>
        <button className={styles.toolbarButton} title="Highlight color">
          <Icon icon="mdi:format-color-highlight" width={16} height={16} />
        </button>
        <input
          type="color"
          value={highlightColor}
          onChange={e => changeHighlightColor(e.target.value)}
          className={styles.colorPicker}
        />
      </div>

      <div className={styles.divider} />

      {/* Insert Menu */}
      <select 
        className={styles.select} 
        defaultValue=""
        onChange={(e) => {
          const insertType = e.target.value;
          if (insertType === 'list') {
            // For now, we'll just log the insert
            // List insertion would need proper Lexical commands
            console.log('Inserting list');
          }
          // Reset the select
          e.target.value = '';
        }}
      >
        <option value="">+ Insert</option>
        <option value="image">Image</option>
        <option value="table">Table</option>
        <option value="list">List</option>
        <option value="quote">Quote</option>
      </select>

      <div className={styles.divider} />

      {/* Alignment */}
      <button
        onClick={() => formatElement('left' as ElementFormatType)}
        className={styles.toolbarButton}
        title="Align left"
      >
        <Icon icon="mdi:format-align-left" width={16} height={16} />
      </button>
      <button
        onClick={() => formatElement('center' as ElementFormatType)}
        className={styles.toolbarButton}
        title="Align center"
      >
        <Icon icon="mdi:format-align-center" width={16} height={16} />
      </button>
      <button
        onClick={() => formatElement('right' as ElementFormatType)}
        className={styles.toolbarButton}
        title="Align right"
      >
        <Icon icon="mdi:format-align-right" width={16} height={16} />
      </button>
      <button
        onClick={() => formatElement('justify' as ElementFormatType)}
        className={styles.toolbarButton}
        title="Justify"
      >
        <Icon icon="mdi:format-align-justify" width={16} height={16} />
      </button>
    </div>
  );
}

// Plugin to handle value changes
function ValueSyncPlugin({
  value,
  setValue,
}: {
  value: string;
  setValue: (value: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const root = $getRoot();
      // Get rich text content as JSON to preserve formatting
      const json = editorState.toJSON();
      setValue(JSON.stringify(json));
    });
  };

  // Initialize editor with value if provided
  useEffect(() => {
    if (value && typeof value === 'string') {
      try {
        // Try to parse as JSON first (rich text)
        const parsedValue = JSON.parse(value);
        editor.setEditorState(editor.parseEditorState(parsedValue));
      } catch {
        // Fallback to plain text
        editor.update(() => {
          const root = $getRoot();
          root.clear();

          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(value));
          root.append(paragraph);
        });
      }
    }
  }, [value, editor]);

  return <OnChangePlugin onChange={onChange} />;
}

function NoteEditor({
  value,
  setValue,
  readOnly = false,
  classes,
  key,
}: Props) {
  const { theme } = usePomodoroGlobalConfig();

  const initialConfig = useMemo(
    () => ({
      namespace: 'NoteEditor',
      nodes: [ListNode, ListItemNode, LinkNode],
      theme: {
        root: 'outline-none',
        text: {
          bold: 'font-bold',
          italic: 'italic',
          underline: 'underline',
        },
      },
      onError: (error: Error) => {
        console.error('Lexical editor error:', error);
      },
    }),
    [],
  );

  return (
    <div
      className={cx(styles.editorContainer, classes?.container)}
      style={{
        backgroundColor: theme === Theme.Dark ? '#2d2d2d' : 'white',
        color: theme === Theme.Dark ? '#ffffff' : '#000000',
      }}
    >
      <LexicalComposer initialConfig={initialConfig} key={key}>
        <div style={{ position: 'relative' }}>
          <ToolbarPlugin readOnly={readOnly} />
          <div style={{ position: 'relative' }}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable className={styles.contentEditable} />
              }
              placeholder={
                <div className={styles.placeholder}>
                  Start writing your note...
                </div>
              }
              ErrorBoundary={() => <div>Something went wrong!</div>}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
            <ListPlugin />
            <LinkPlugin />
            <ValueSyncPlugin value={value} setValue={setValue} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}

export default NoteEditor;
