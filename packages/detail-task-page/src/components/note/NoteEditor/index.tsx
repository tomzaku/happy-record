import '@blocknote/core/fonts/inter.css';
import { Icon } from '@iconify/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import styles from './index.module.scss';
import cx from 'classnames';
import Button from '@moon-ui/button/src/DefaultButton';
import { Block } from '@blocknote/core';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';

type Props = {
  value: Block[];
  setValue: (value: Block[]) => void;
  readOnly?: boolean;
  classes?: {
    container?: string;
  };
  onClickEdit?: () => void;
  onClickSave?: () => void;
  shouldShowSaveButton?: boolean;
};

function NoteEditor({
  value,
  setValue,
  readOnly,
  classes,
  onClickEdit,
  onClickSave,
  shouldShowSaveButton,
}: Props) {
  const editor = useCreateBlockNote({
    domAttributes: {
      editor: {
        class: styles.editor,
      },
    },
    initialContent: value,
  });
  const { theme } = usePomodoroGlobalConfig();
  return (
    <div className={cx(styles.container, classes?.container)}>
      {readOnly && (
        <Icon
          onClick={onClickEdit}
          className={styles.editIcon}
          icon="solar:pen-new-square-outline"
          width={24}
          height={24}
        />
      )}
      <BlockNoteView
        className={styles.editor}
        editable={!readOnly}
        theme={theme === Theme.Dark ? 'dark' : 'light'}
        editor={editor}
        onChange={() => setValue(editor.document)}
      />
      {shouldShowSaveButton && !readOnly && (
        <Button onClick={onClickSave} className={styles.saveButton}>
          Save
        </Button>
      )}
    </div>
  );
}

export default NoteEditor;
