import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { ChecklistTemplate } from '@dreamer/global';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { Day } from '@dreamer/tasks-page-common';
import cx from 'classnames';
import styles from './index.module.scss';
import { RecordField } from '@dreamer/global/src/store/record-field';

type Props = {
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
  /** Whether `fields` is still loading (a separate, slower fetch than the template itself — see
   * useChecklistTemplateSharedPage.ts) — told apart from "loaded, genuinely no fields" so this
   * doesn't render as a bare empty section while the real list is still in flight. */
  fieldsLoading?: boolean;
};
const allDays = [
  { label: 'M', value: Day.Mon },
  { label: 'T', value: Day.Tue },
  { label: 'W', value: Day.Wed },
  { label: 'T', value: Day.Thu },
  { label: 'F', value: Day.Fri },
  { label: 'S', value: Day.Sat },
  { label: 'S', value: Day.Sun },
];

// The themed challenge card — icon avatar, title, day-of-week pills, a
// dashed divider, and the fields the owner shared. Every color/radius here
// comes from the `--ct-*` custom properties theme.ts sets at the document
// root (see useApplyChallengeTheme), so this one markup renders correctly
// under all 3 CHALLENGE_THEMES without a per-theme fork.
const TaskSharedCard = ({ checklistTemplate, fields = [], fieldsLoading }: Props) => {
  const days = getDaysFromRepeat(checklistTemplate?.repeat);
  if (!checklistTemplate) return null;
  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.avatar}>
          <Icon width={24} icon={checklistTemplate.avatar?.name} color="#fff" />
        </div>
        <Typography.Title level={3} noMargin style={{ color: 'var(--ct-heading-color)' }}>
          {checklistTemplate.title}
        </Typography.Title>
      </div>

      <div className={styles.dayContainer}>
        {allDays.map((d, i) => (
          <div
            key={i}
            className={cx(styles.day, days.includes(d.value) && styles.dayActive)}
          >
            {d.label}
          </div>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.fields}>
        {fieldsLoading ? (
          <div className={styles.fieldsLoading}>
            <Icon width={18} icon="svg-spinners:180-ring" />
          </div>
        ) : (
          fields.map(f => (
            <div key={f.id} className={styles.fieldRow}>
              <Icon width={20} icon={f.icon} color="var(--ct-accent)" className={styles.fieldIcon} />
              <div>
                <div className={styles.fieldTitle}>{f.title}</div>
                {f.description && <div className={styles.fieldDescription}>{f.description}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskSharedCard;
