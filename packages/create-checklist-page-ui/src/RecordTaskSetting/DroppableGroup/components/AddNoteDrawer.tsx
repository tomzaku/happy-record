import React from 'react';
import NoteEditor from '@moon-ui/note-editor';
import Drawer from '@moon-ui/drawer';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import { useAiNoteGenerate } from '@dreamer/global';
import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (value: unknown) => void;
  note?: unknown;
};

const AddNoteDrawer = ({ visible, onClose, onSubmit, note }: Props) => {
  const [value, setValue] = React.useState(note);
  const intl = useIntl();
  // "/ai" inside the editor below — see add-note-page-ui's own AddNotePage for the same wiring.
  const { isPro, generate } = useAiNoteGenerate();
  return (
    <Drawer
      className={styles.container}
      onBlur={() => onClose()}
      visible={visible}
    >
      <div className={styles.header}>
        <Typography.Title noMargin level={4}>
          {intl.formatMessage({
            id: 'AddNoteDrawer.title',
            defaultMessage: 'Add Note',
          })}
        </Typography.Title>

        <Icon
          width={32}
          icon="material-symbols:close-rounded"
          onClick={onClose}
        />
      </div>
      <div className={styles.body}>
        <NoteEditor
          value={value}
          setValue={setValue}
          withoutBorder
          ai={{ isPro, generate }}
          classes={{
            container: styles.editor,
          }}
        />
      </div>
      <Button className={styles.button} onClick={() => onSubmit(value)}>
        Submit
      </Button>
    </Drawer>
  );
};
export default AddNoteDrawer;
