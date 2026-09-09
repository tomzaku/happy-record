import { useState } from 'react';
import Icon from '@moon-ui/icon/Icon';
import { Challenge, ChecklistTemplate, getActiveFieldGroups } from '@dreamer/global';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { Day } from '@dreamer/tasks-page-common';
import cx from 'classnames';
import styles from './index.module.scss';
import { RecordField } from '@dreamer/global/src/store/record-field';
import FieldGroupNotePreview from './FieldGroupNotePreview';
import { useChallengeStartCountdown } from '../../useChallengeStartCountdown';
import StartDateWidget from '../challenge-widgets/StartDateWidget';
import TargetsWidget from '../challenge-widgets/TargetsWidget';
import TitleWidget from '../challenge-widgets/TitleWidget';

type Props = {
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
  /** Whether `fields` is still loading (a separate, slower fetch than the template itself — see
   * useChecklistTemplateSharedPage.ts) — told apart from "loaded, genuinely no fields" so this
   * doesn't render as a bare empty section while the real list is still in flight. */
  fieldsLoading?: boolean;
  /** Undefined while the challenge row is still loading (same "not there yet" gap as everywhere
   * else this page reads it) — `startDate`/`targets` just don't render until it lands. */
  challenge?: Challenge;
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
// under all 4 CHALLENGE_THEMES without a per-theme fork.
// How many fields show before "Show more" — enough to give a sense of the template without the
// list itself being what drags this column past the CTA on the left (see index.desktop.tsx's own
// `.intro` comment).
const COLLAPSED_FIELD_COUNT = 2;

const TaskSharedCard = ({ checklistTemplate, fields = [], fieldsLoading, challenge }: Props) => {
  const days = getDaysFromRepeat(checklistTemplate?.repeat);
  const [showAllFields, setShowAllFields] = useState(false);
  // "Starts in 2d 6h" while upcoming, "Started Sep 10, 2026" once it's passed — ticks live, see
  // useChallengeStartCountdown's own comment for why this needs a hook rather than a one-shot format().
  const startCountdown = useChallengeStartCountdown(challenge?.startDate);
  if (!checklistTemplate) return null;
  const visibleFields = showAllFields ? fields : fields.slice(0, COLLAPSED_FIELD_COUNT);
  const hiddenFieldCount = fields.length - visibleFields.length;
  const widgetTargets = (challenge?.targets ?? []).map(t => ({
    id: t.id,
    icon: t.icon,
    title: t.title,
    goal: t.goal,
    unit: t.unit,
  }));
  return (
    <div className={styles.container}>
      <TitleWidget
        layout={challenge?.titleWidgetLayout ?? 'row'}
        icon={checklistTemplate.avatar?.name}
        title={checklistTemplate.title}
      />

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

      <StartDateWidget layout={challenge?.startWidgetLayout ?? 'countdown'} countdown={startCountdown} />

      <TargetsWidget layout={challenge?.targetsWidgetLayout ?? 'list'} targets={widgetTargets} />

      <div className={styles.divider} />

      <div className={styles.fields}>
        {fieldsLoading ? (
          <div className={styles.fieldsLoading}>
            <Icon width={18} icon="svg-spinners:180-ring" />
          </div>
        ) : (
          <>
            {visibleFields.map(f => (
              <div key={f.id} className={styles.fieldRow}>
                <Icon width={20} icon={f.icon} color="var(--ct-accent)" className={styles.fieldIcon} />
                <div>
                  <div className={styles.fieldTitle}>{f.title}</div>
                  {f.description && <div className={styles.fieldDescription}>{f.description}</div>}
                </div>
              </div>
            ))}
            {hiddenFieldCount > 0 && (
              <button type="button" className={styles.showMoreButton} onClick={() => setShowAllFields(true)}>
                Show {hiddenFieldCount} more
              </button>
            )}
            {showAllFields && fields.length > COLLAPSED_FIELD_COUNT && (
              <button type="button" className={styles.showMoreButton} onClick={() => setShowAllFields(false)}>
                Show less
              </button>
            )}
          </>
        )}
      </div>

      {/* Same instructional note a field group's Home tab shows once joined (see
          ChecklistFieldGroupView) — previewed here, read-only, so a prospective joiner can see
          what they're signing up for before taking the challenge. Gated on `fieldsLoading` too:
          `checklistTemplate.fieldGroups` comes from the same parallel fetch as `fields` (see
          useChecklistTemplateSharedPage.ts), and is just an empty stub until that resolves. */}
      {!fieldsLoading && (
        <div className={styles.notesList}>
          {getActiveFieldGroups(checklistTemplate.fieldGroups ?? []).map(fieldGroup => (
            <FieldGroupNotePreview key={fieldGroup.id} fieldGroup={fieldGroup} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskSharedCard;
