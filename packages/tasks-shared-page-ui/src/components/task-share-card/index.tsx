import Card from '@moon-ui/card';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { ChecklistTemplate } from '@dreamer/global';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { Day } from '@dreamer/tasks-page-common';
import cx from 'classnames';
import styles from './index.module.scss';

type Props = {
  checklistTemplate: ChecklistTemplate;
};
const allDays = [
  { label: 'M', value: Day.Mon },
  { label: 'T', value: Day.Tue },
  { label: 'T', value: Day.Thu },
  { label: 'W', value: Day.Wed },
  { label: 'F', value: Day.Fri },
  { label: 'S', value: Day.Sat },
  { label: 'S', value: Day.Sun },
];
const TaskSharedCard = ({ checklistTemplate }: Props) => {
  const days = getDaysFromRepeat(checklistTemplate.repeat);
  console.log('days', days);
  return (
    <div className={styles.container}>
      <Icon width={24} icon={checklistTemplate.avatar?.name} />
      <div className={styles.body}>
        <Typography.Title level={3} noMargin>
          {checklistTemplate.title}
        </Typography.Title>
        <Typography.Text className={styles.dayContainer}>
          {allDays.map(d => (
            <div
              className={cx(
                styles.day,
                days.includes(d.value) && styles.activeDay,
              )}
            >
              {d.label}
            </div>
          ))}
        </Typography.Text>
      </div>
    </div>
  );
};

export default TaskSharedCard;
