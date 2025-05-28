import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';
import cx from 'classnames';

type DroppableGroupProps = {
  id: string;
  title: string;
  items: string[]; // IDs of items within this group
  children: React.ReactNode;
};

const DroppableGroup = ({
  id,
  title,
  items,
  children,
}: DroppableGroupProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'Group',
      items: items,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cx(styles.groupContainer, isOver && styles.groupOver)}
    >
      <Typography.Title noMargin level={4} className={styles.groupTitle}>
        {title}
      </Typography.Title>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
};

export default DroppableGroup;
