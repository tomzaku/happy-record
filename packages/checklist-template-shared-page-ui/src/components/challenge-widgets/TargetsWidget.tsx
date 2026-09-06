// One of 3 independent widgets on the invite page — see StartDateWidget's own comment for why
// each has its own layout picker. Only ever renders fields that actually have a target set (see
// TaskSharedCard's own filter) — a template with no group targets renders nothing, any layout.
import Icon from '@moon-ui/icon/Icon';
import type { TargetsWidgetLayout } from '@dreamer/global';
import styles from './TargetsWidget.module.scss';

export type TargetsWidgetItem = {
  fieldId: string;
  icon: string;
  title: string;
  target: number;
  unit?: string;
};

type Props = {
  layout: TargetsWidgetLayout;
  targets: TargetsWidgetItem[];
};

const TargetsWidget = ({ layout, targets }: Props) => {
  if (!targets.length) return null;

  // Same label above every layout — without it the numbers alone don't read as "the collective
  // goal to hit," just as an arbitrary count.
  const label = (
    <div className={styles.goalLabel}>
      <Icon width={14} icon="solar:flag-2-line-duotone" />
      Goal to achieve
    </div>
  );

  if (layout === 'tiles') {
    return (
      <div className={styles.wrapper}>
        {label}
        <div className={styles.row}>
          {targets.map(t => (
            <div key={t.fieldId} className={styles.tile}>
              <Icon width={18} icon={t.icon} className={styles.tileIcon} />
              <div className={styles.tileValue}>
                {t.target}
                {t.unit ? ` ${t.unit}` : ''}
              </div>
              <div className={styles.tileCaption}>{t.title}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'combined') {
    return (
      <div className={styles.wrapper}>
        {label}
        <div className={styles.combined}>
          {targets.map(t => (
            <div key={t.fieldId} className={styles.combinedRow}>
              <Icon width={16} icon={t.icon} className={styles.tileIcon} />
              <span>
                {t.title}: {t.target}
                {t.unit ? ` ${t.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 'list'
  return (
    <div className={styles.wrapper}>
      {label}
      <div className={styles.list}>
        {targets.map(t => (
          <div key={t.fieldId} className={styles.listRow}>
            <Icon width={16} icon={t.icon} className={styles.tileIcon} />
            <div>
              <div className={styles.listTitle}>{t.title}</div>
              <div className={styles.listGoal}>
                Goal: {t.target}
                {t.unit ? ` ${t.unit}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TargetsWidget;
