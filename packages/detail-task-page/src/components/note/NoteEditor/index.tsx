import React from 'react';

import YooptaEditor, { createYooptaEditor } from '@yoopta/editor';
import type { YooptaContentValue, YooptaOnChangeOptions } from '@yoopta/editor';

import styles from './index.module.scss';
import cx from 'classnames';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';

type Props = {
  value: YooptaContentValue;
  setValue: (value: YooptaContentValue) => void;
  readOnly?: boolean;
  classes?: {
    container?: string;
  };
  onClickEdit?: () => void;
  onClickSave?: () => void;
  shouldShowSaveButton?: boolean;
  withoutBorder?: boolean;
  showEditIcon?: boolean;
  key?: string | number; // Add key prop to force re-mount
};

function NoteEditor({
  value,
  setValue,
  readOnly,
  classes,
  showEditIcon,
  onClickEdit,
  onClickSave,
  shouldShowSaveButton,
  withoutBorder,
  key,
}: Props) {
  const [isFocused, setIsFocused] = React.useState(false);
  const { theme } = usePomodoroGlobalConfig();
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [plugins, setPlugins] = React.useState<unknown[]>([]);
  const [tools, setTools] = React.useState<Record<string, unknown>>({});
  const [marks, setMarks] = React.useState<unknown[]>([]);

  const editor = React.useMemo(() => createYooptaEditor(), []);
  const selectionRef = React.useRef(null);

  // Dynamically load all Yoopta components
  React.useEffect(() => {
    const loadComponents = async () => {
      try {
        const [
          { default: Paragraph },
          { default: Blockquote },
          { default: Embed },
          { default: Link },
          { default: Callout },
          { default: Accordion },
          { NumberedList, BulletedList, TodoList },
          { Bold, Italic, CodeMark, Underline, Strike, Highlight },
          { HeadingOne, HeadingThree, HeadingTwo },
          { default: Code },
          { default: Table },
          { default: Divider },
          { default: ActionMenuList, DefaultActionMenuRender },
          { default: Toolbar, DefaultToolbarRender },
          { default: LinkTool, DefaultLinkToolRender },
        ] = await Promise.all([
          import('@yoopta/paragraph'),
          import('@yoopta/blockquote'),
          import('@yoopta/embed'),
          import('@yoopta/link'),
          import('@yoopta/callout'),
          import('@yoopta/accordion'),
          import('@yoopta/lists'),
          import('@yoopta/marks'),
          import('@yoopta/headings'),
          import('@yoopta/code'),
          import('@yoopta/table'),
          import('@yoopta/divider'),
          import('@yoopta/action-menu-list'),
          import('@yoopta/toolbar'),
          import('@yoopta/link-tool'),
        ]);

        const loadedPlugins = [
          Paragraph,
          Table,
          Divider.extend({
            elementProps: {
              divider: props => ({
                ...props,
                color: '#007aff',
              }),
            },
          }),
          Accordion,
          HeadingOne,
          HeadingTwo,
          HeadingThree,
          Blockquote,
          Callout,
          NumberedList,
          BulletedList,
          TodoList,
          Code,
          Link,
          Embed,
        ];

        const loadedTools = {
          ActionMenu: {
            render: DefaultActionMenuRender,
            tool: ActionMenuList,
          },
          Toolbar: {
            render: DefaultToolbarRender,
            tool: Toolbar,
          },
          LinkTool: {
            render: DefaultLinkToolRender,
            tool: LinkTool,
          },
        };

        const loadedMarks = [
          Bold,
          Italic,
          CodeMark,
          Underline,
          Strike,
          Highlight,
        ];

        setPlugins(loadedPlugins);
        setTools(loadedTools);
        setMarks(loadedMarks);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Yoopta components:', error);
        setIsLoaded(true); // Still set to true to show editor
      }
    };
    loadComponents();
  }, []);

  const onChange = (
    value: YooptaContentValue,
    options: YooptaOnChangeOptions,
  ) => {
    setValue(value);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Debug selection changes
  React.useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        console.log('Text selected:', selection.toString());
        console.log('Selection range count:', selection.rangeCount);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const isEmpty =
    !value ||
    (Array.isArray(value) && value.length === 0) ||
    (Array.isArray(value) &&
      value.length === 1 &&
      value[0]?.type === 'paragraph' &&
      (!value[0]?.children ||
        value[0]?.children?.length === 0 ||
        (value[0]?.children?.length === 1 &&
          value[0]?.children[0]?.text === '')));

  return (
    <div
      ref={selectionRef}
      className={cx(
        styles.container,
        classes?.container,
        withoutBorder && styles.withoutBorder,
        styles[`theme${theme === Theme.Dark ? 'Dark' : 'Light'}`],
      )}
      data-theme={theme}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {isEmpty && !isFocused && (
        <div className={styles.placeholder}>Type text..</div>
      )}
      {plugins.length === 0 || !isLoaded ? null : (
        <YooptaEditor
          readOnly={readOnly}
          key={key} // Use key to force re-mount when needed
          selectionBoxRoot={selectionRef}
          editor={editor}
          marks={marks}
          plugins={plugins}
          value={value}
          placeholder="Type text.."
          tools={tools}
          style={{ width: '100%' }}
          onChange={onChange}
          autoFocus={false}
        />
      )}
    </div>
  );
}

export default NoteEditor;
