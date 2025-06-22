import React from 'react';

import YooptaEditor, { createYooptaEditor } from '@yoopta/editor';
import type { YooptaContentValue, YooptaOnChangeOptions } from '@yoopta/editor';
import Paragraph from '@yoopta/paragraph';
import Blockquote from '@yoopta/blockquote';
import Embed from '@yoopta/embed';
import Image from '@yoopta/image';
import Link from '@yoopta/link';
import Callout from '@yoopta/callout';
import Video from '@yoopta/video';
import File from '@yoopta/file';
import Accordion from '@yoopta/accordion';
import { NumberedList, BulletedList, TodoList } from '@yoopta/lists';
import {
  Bold,
  Italic,
  CodeMark,
  Underline,
  Strike,
  Highlight,
} from '@yoopta/marks';
import { HeadingOne, HeadingThree, HeadingTwo } from '@yoopta/headings';
import Code from '@yoopta/code';
import Table from '@yoopta/table';
import Divider from '@yoopta/divider';
import ActionMenuList, {
  DefaultActionMenuRender,
} from '@yoopta/action-menu-list';
import Toolbar, { DefaultToolbarRender } from '@yoopta/toolbar';
import LinkTool, { DefaultLinkToolRender } from '@yoopta/link-tool';

// import '@blocknote/core/fonts/inter.css';
// import { Icon } from '@moon-ui/icon/Icon';
// import { BlockNoteView } from '@blocknote/mantine';
// import '@blocknote/mantine/style.css';
// import { useCreateBlockNote } from '@blocknote/react';
import styles from './index.module.scss';
import cx from 'classnames';
import Button from '@moon-ui/button/src/DefaultButton';
import { Block } from '@blocknote/core';
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
  key?: string | number;
};

const plugins = [
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

const TOOLS = {
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

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

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
  // const [value, setValue] = React.useState<YooptaContentValue>();
  const [isFocused, setIsFocused] = React.useState(false);
  const { theme } = usePomodoroGlobalConfig();

  const editor = React.useMemo(() => createYooptaEditor(), []);
  const selectionRef = React.useRef(null);

  // const editor = useCreateBlockNote({
  //   domAttributes: {
  //     editor: {
  //       class: styles.editor,
  //     },
  //   },
  //   initialContent: value,
  // });
  //   React.useEffect(() => {
  //   if (editor && value) {
  //     // Replace the root blocks with the new content
  //     editor.replaceBlocks(editor.document, value);
  //   }
  // }, [editor, value]);
  // const { theme } = usePomodoroGlobalConfig();
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
    >
      {isEmpty && !isFocused && (
        <div className={styles.placeholder}>Type text..</div>
      )}
      <YooptaEditor
        key={key}
        selectionBoxRoot={selectionRef}
        editor={editor}
        marks={MARKS}
        plugins={plugins}
        value={value}
        placeholder="Type text.."
        tools={TOOLS}
        style={{ width: '100%' }}
        onChange={onChange}
        autoFocus={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );

  // return (
  //   <div
  //     className={cx(
  //       styles.container,
  //       classes?.container,
  //       withoutBorder && styles.withoutBorder,
  //     )}
  //   >
  //     {readOnly && showEditIcon && (
  //       <Icon
  //         onClick={onClickEdit}
  //         className={styles.editIcon}
  //         icon="solar:pen-new-square-outline"
  //         width={24}
  //         height={24}
  //       />
  //     )}
  //     <BlockNoteView
  //       className={styles.editor}
  //       editable={!readOnly}
  //       theme={theme === Theme.Dark ? 'dark' : 'light'}
  //       editor={editor}
  //       onChange={() => setValue(editor.document)}
  //     />
  //     {shouldShowSaveButton && !readOnly && (
  //       <Button onClick={onClickSave} className={styles.saveButton}>
  //         Save
  //       </Button>
  //     )}
  //   </div>
  // );
}

export default NoteEditor;
