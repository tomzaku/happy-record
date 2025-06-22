import Card from '@moon-ui/card';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { ChecklistTemplate } from '@dreamer/global';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { Day } from '@dreamer/tasks-page-common';
import cx from 'classnames';
import styles from './index.module.scss';
import { RecordField } from '@dreamer/global/src/store/record-field';
import List from '@moon-ui/list';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import Division from '@moon-ui/division';

type Props = {
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
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
const TaskSharedCard = ({ checklistTemplate, fields = [] }: Props) => {
  const days = getDaysFromRepeat(checklistTemplate.repeat);
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
        <Division className={styles.hr} />
        {fields.map(f => {
          return (
            <List.ItemMeta
              logo={<Icon width={24} icon={f.icon} />}
              title={f.title}
              description={f.description}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TaskSharedCard;
