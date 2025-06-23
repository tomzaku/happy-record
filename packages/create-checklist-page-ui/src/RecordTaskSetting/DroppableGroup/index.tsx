import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';
import cx from 'classnames';
import Drawer from '@moon-ui/drawer';
import Button from '@moon-ui/button/src/DefaultButton';
import Input from '@moon-ui/input';
import { useIntl } from '@dreamer/translation';
import Icon from '@moon-ui/icon/Icon';
import AddNoteDrawer from './components/AddNoteDrawer';

type DroppableGroupProps = {
  id: string;
  title: string;
  items: string[]; // IDs of items within this group
  note?: unknown;
  children: React.ReactNode;
  onSubmitRename: (text: string) => void;
  onSubmitNote: (value: unknown) => void;
};

const DroppableGroup = ({
  id,
  title,
  items,
  children,
  note,
  onSubmitRename,
  onSubmitNote,
}: DroppableGroupProps) => {
  const intl = useIntl();
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'Group',
      items: items,
    },
  });
  const [text, setText] = React.useState(title);
  const [openRename, setOpenRename] = React.useState(false);
  const [addNoteDrawerVisible, setAddNoteDrawerVisible] = React.useState(false);

  return (
    <div
      ref={setNodeRef}
      className={cx(styles.groupContainer, isOver && styles.groupOver)}
    >
      <Drawer
        onBlur={() => {
          setOpenRename(false);
        }}
        visible={openRename}
        className={styles.drawerContainer}
      >
        <div className={styles.header}>
          <Typography.Title noMargin level={4}>
            {intl.formatMessage({
              id: 'droppablegroup.groupheading',
              defaultMessage: 'Rename Group',
            })}
          </Typography.Title>

          <Icon
            width={32}
            icon="material-symbols:close-rounded"
            onClick={() => setOpenRename(false)}
          />
        </div>
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          border="solid"
          className={styles.input}
        />
        <Button
          className={styles.button}
          type="primary"
          size="lg"
          onClick={() => {
            onSubmitRename(text);
            setOpenRename(false);
          }}
        >
          Submit
        </Button>
      </Drawer>
      <AddNoteDrawer
        visible={addNoteDrawerVisible}
        onClose={() => setAddNoteDrawerVisible(false)}
        onSubmit={value => {
          onSubmitNote(value);
          setAddNoteDrawerVisible(false);
        }}
        note={note}
      />
      <Typography.Title
        noMargin
        level={4}
        className={styles.groupTitle}
        onClick={() => {
          setOpenRename(true);
        }}
      >
        {title}
        <Icon className={styles.editIcon} icon="solar:pen-2-line-duotone" />
      </Typography.Title>
      <Button
        onClick={() => {
          setAddNoteDrawerVisible(true);
        }}
        type="dash"
        className={styles.addNoteButton}
      >
        {note
          ? intl.formatMessage({
              id: 'RecordTaskSetting.view-note',
              defaultMessage: 'View Note',
            })
          : intl.formatMessage({
              id: 'RecordTaskSetting.add-note',
              defaultMessage: 'Add Note',
            })}
      </Button>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
};

export default DroppableGroup;
