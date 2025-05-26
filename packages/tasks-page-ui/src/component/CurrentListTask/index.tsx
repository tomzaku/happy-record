import React from 'react';

// Component
import CurrentTaskItem from '../CurrentTaskItem';
import TaskItemActionModal from '../TaskItemActionModal';

// Hooks
import { useTask } from '@dreamer/tasks-page-common';
import { useIntl } from '@dreamer/translation';

// Type
import Typography from '@moon-ui/typography';

import styles from './index.module.scss';
import Checkbox from '@moon-ui/checkbox';
import EditTaskModal from '../EditTaskModal';
import DraggableList from './DraggableList';

type Props = {
  className?: string;
};

export default function CurrentListTask({ className }: Props) {
  const intl = useIntl();
  const [modalMobileVisible, setModalMobileVisible] = React.useState(false);
  const [modalInfo, setModalInfo] = React.useState({ taskId: '' });
  const [modalEditTaskVisible, setModalEditTaskVisible] = React.useState(false);
  const {
    activeTaskId,
    setCurrentTaskIds,
    currentTaskIds,
    filter,
    setFilter,
    task,
  } = useTask();
  if (!task) return null;
  return (
    <div className={className}>
      <TaskItemActionModal
        visible={modalMobileVisible}
        taskId={modalInfo.taskId}
        onDismiss={() => setModalMobileVisible(false)}
        onClickEdit={() => setModalEditTaskVisible(true)}
      />
      <EditTaskModal
        onDismiss={() => setModalEditTaskVisible(false)}
        visible={modalEditTaskVisible}
        taskId={modalInfo.taskId}
      />
      <div className={styles.header}>
        <Typography.Paragraph noMargin>
          {intl.formatMessage({
            id: 'ListTask.label-your-list-tasks',
            defaultMessage: 'Your List Task',
          })}
        </Typography.Paragraph>
        <div className={styles.heading}>
          <Checkbox
            checked={filter.showDoneTask}
            onChange={() => {
              setFilter({
                ...filter,
                showDoneTask: !filter.showDoneTask,
              });
            }}
            className={styles.checkbox}
          />
          <Typography.Text className={styles.doneTaskText} isDescription>
            {intl.formatMessage({
              id: 'ListTask.label-show-done-task',
              defaultMessage: 'Show Done Tasks',
            })}
          </Typography.Text>
          <Checkbox
            checked={filter.showAllTask}
            onChange={() => {
              setFilter({
                ...filter,
                showAllTask: !filter.showAllTask,
              });
            }}
            className={styles.checkbox}
          />
          <Typography.Text isDescription>
            {intl.formatMessage({
              id: 'ListTask.label-show-all-tasks',
              defaultMessage: 'Show All Tasks',
            })}
          </Typography.Text>
        </div>
      </div>
      <div className={styles.body}>
        <DraggableList
          items={currentTaskIds}
          onChange={setCurrentTaskIds}
          renderItem={(id, bind, index) => {
            return (
              <CurrentTaskItem
                handlerBind={bind}
                key={id}
                onLongPress={taskId => {
                  setModalMobileVisible(true);
                  setModalInfo({ taskId });
                }}
                taskId={id}
                disabled={Boolean(activeTaskId && activeTaskId !== id)}
                hasDivision={index !== currentTaskIds.length - 1}
                onClickEdit={taskId => {
                  setModalEditTaskVisible(true);
                  setModalInfo({ taskId });
                }}
              />
            );
          }}
        />
      </div>
      {currentTaskIds.length === 0 && (
        <div className={styles.empty}>
          <Typography.Paragraph isDescription>
            {intl.formatMessage({
              id: 'msg_task_empty',
              defaultMessage: 'Your task is empty',
            })}
          </Typography.Paragraph>
        </div>
      )}
    </div>
  );
}
