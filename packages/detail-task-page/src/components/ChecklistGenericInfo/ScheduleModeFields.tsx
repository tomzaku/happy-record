import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Radio from '@moon-ui/radio';
import { useIntl } from '@dreamer/translation';
import styles from './ScheduleModeFields.module.scss';

type ScheduleMode = 'general' | 'per_group';

/**
 * Shown in ChecklistGenericInfo's Schedule modal the first time a template has field groups and
 * `scheduleMode` hasn't been chosen yet (see ChecklistTemplate.scheduleMode's own comment).
 * Picking either card just stages `tempScheduleMode` — the caller swaps in the matching editor
 * right below, still in this same open dialog; nothing is persisted until the modal's own Save.
 */
export const ScheduleModeChooser = ({ onChoose }: { onChoose: (mode: ScheduleMode) => void }) => {
  const intl = useIntl();

  return (
    <div className={styles.chooser}>
      <Typography.Text className={styles.chooserTitle}>
        {intl.formatMessage({
          id: 'checklist-generic-info.schedule-mode-chooser-title',
          defaultMessage: "How should this task's schedule work?",
        })}
      </Typography.Text>
      <div className={styles.cardRow}>
        <button type="button" className={styles.card} onClick={() => onChoose('general')}>
          <Icon width={24} icon="solar:calendar-date-line-duotone" className={styles.cardIcon} />
          <Typography.Text className={styles.cardTitle}>
            {intl.formatMessage({
              id: 'checklist-generic-info.schedule-mode-general-title',
              defaultMessage: 'General Schedule',
            })}
          </Typography.Text>
          <Typography.Text className={styles.cardDescription}>
            {intl.formatMessage({
              id: 'checklist-generic-info.schedule-mode-general-description',
              defaultMessage: 'One combined schedule for every group',
            })}
          </Typography.Text>
        </button>
        <button type="button" className={styles.card} onClick={() => onChoose('per_group')}>
          <Icon width={24} icon="solar:layers-minimalistic-line-duotone" className={styles.cardIcon} />
          <Typography.Text className={styles.cardTitle}>
            {intl.formatMessage({
              id: 'checklist-generic-info.schedule-mode-per-group-title',
              defaultMessage: 'Per-Group Schedule',
            })}
          </Typography.Text>
          <Typography.Text className={styles.cardDescription}>
            {intl.formatMessage({
              id: 'checklist-generic-info.schedule-mode-per-group-description',
              defaultMessage: 'Each group keeps its own schedule',
            })}
          </Typography.Text>
        </button>
      </div>
    </div>
  );
};

/**
 * Small segmented control shown above the schedule editor once a mode is set (chosen just now via
 * ScheduleModeChooser, or already persisted from a previous save) — lets the owner change their
 * mind later. Switching away from 'per_group' never clears the staged field-group edits, it just
 * stops them from being used for scheduling (see scheduleUtils.ts's `hasGroupSchedule`), so
 * switching back restores whatever was already there.
 */
export const ScheduleModeSwitcher = ({
  mode,
  onChange,
}: {
  mode: ScheduleMode;
  onChange: (mode: ScheduleMode) => void;
}) => {
  const intl = useIntl();

  return (
    <div className={styles.switcherRow}>
      <Radio
        isButton
        value={mode}
        onChangeValue={value => onChange(value as ScheduleMode)}
        options={[
          {
            value: 'general',
            label: intl.formatMessage({
              id: 'checklist-generic-info.schedule-mode-switch-general',
              defaultMessage: 'General',
            }),
          },
          {
            value: 'per_group',
            label: intl.formatMessage({
              id: 'checklist-generic-info.schedule-mode-switch-per-group',
              defaultMessage: 'Per-Group',
            }),
          },
        ]}
      />
    </div>
  );
};
