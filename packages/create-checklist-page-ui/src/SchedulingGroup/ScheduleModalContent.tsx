import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';
import MultiSelectButton from '@moon-ui/button/src/MultiSelectButton';
import { useIntl } from '@dreamer/translation';
import { a, useSpring } from '@react-spring/web';
import { Day } from '@dreamer/tasks-page-common';
import { FieldGroup, getActiveFieldGroups, mergeEditedFieldGroups } from '@dreamer/global';
import GroupScheduleList from './GroupScheduleList';
import styles from './index.module.scss';

interface ScheduleModalContentProps {
  tempWeeklyHobbies: Day[];
  setTempWeeklyHobbies: (hobbies: Day[]) => void;
  tempDate: string;
  setTempDate: (date: string) => void;
  tempTime: string;
  setTempTime: (time: string) => void;
  isDesktop?: boolean;
  /**
   * Suppresses the "Start Date Section" below — ChecklistGenericInfo's own Schedule/My Reminder
   * dialogs pass this, since that page now edits start date as its own top-level General
   * Settings row instead of bundling it into the Schedule form (see that component's own
   * handleSaveStartDate). The "create a new task" flow (create-checklist-page-ui's own usage)
   * still wants it here — picking days/time and a start date together makes sense while first
   * setting a template up.
   */
  hideStartDate?: boolean;
  /**
   * When the template has active (non-archived — see FieldGroup's own `archivedAt`) field
   * groups, the day picker (and the template-level Time section) are replaced by
   * GroupScheduleList — one editable row per group, each with its own days and time, rather than
   * a single picker for the whole template. Editing the template's own days directly would be
   * pointless: the store derives them as the union of the groups' own days on every save
   * (getEffectiveDayOfWeek in @dreamer/global's scheduleUtils) regardless of what's picked here,
   * so this is where that per-group data actually lives and gets edited — reachable from one
   * place for every group instead of going into each group's own settings menu (which doesn't
   * edit `repeat` at all — see ChecklistFieldGroupMenu's own doc comment).
   *
   * May include archived groups — this component filters them out of what GroupScheduleList
   * sees and re-merges its edits back into the full array before calling
   * `onFieldGroupsChange`, so callers can just pass their whole `fieldGroups` state through
   * unchanged rather than each having to do that filtering/merging themselves.
   */
  fieldGroups?: FieldGroup[];
  onFieldGroupsChange?: (groups: FieldGroup[]) => void;
}

const ScheduleModalContent: React.FC<ScheduleModalContentProps> = ({
  tempWeeklyHobbies,
  setTempWeeklyHobbies,
  tempDate,
  setTempDate,
  tempTime,
  setTempTime,
  isDesktop = false,
  fieldGroups,
  onFieldGroupsChange,
  hideStartDate = false,
}) => {
  const intl = useIntl();
  const activeFieldGroups = fieldGroups ? getActiveFieldGroups(fieldGroups) : undefined;
  const hasFieldGroups = (activeFieldGroups?.length ?? 0) > 0;

  // Temporary state for time editing
  const [tempHour, setTempHour] = React.useState('');
  const [tempMinute, setTempMinute] = React.useState('');

  // Sync temp time state with tempTime prop
  React.useEffect(() => {
    if (tempTime) {
      const [h, m] = tempTime.split(':');
      setTempHour(h);
      setTempMinute(m);
    } else {
      setTempHour('');
      setTempMinute('');
    }
  }, [tempTime]);

  const handleTempHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHour = e.target.value;
    setTempHour(newHour);
    if (newHour && tempMinute) {
      setTempTime(`${newHour}:${tempMinute}`);
    } else {
      setTempTime('');
    }
  };

  const handleTempMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinute = e.target.value;
    setTempMinute(newMinute);
    if (tempHour && newMinute) {
      setTempTime(`${tempHour}:${newMinute}`);
    } else {
      setTempTime('');
    }
  };

  // Generate options
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, '0'),
  );

  const animationStyles = useSpring({
    maxHeight: 80, // Always show the day selection buttons when modal is open
  });

  return (
    <div className={styles.modalContent}>
      {/* Build Hobby Section */}
      <div className={styles.sectionContainer}>
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
          noPaddingHorizontal
          title={intl.formatMessage({
            defaultMessage: 'Build Hobby',
            id: 'label-build-Hobby',
          })}
          description={intl.formatMessage({
            defaultMessage: 'Select days to achieve a good hobby',
            id: 'build-weekly-hobby-subtitle',
          })}
        />
        {hasFieldGroups && fieldGroups && activeFieldGroups && onFieldGroupsChange ? (
          // No fixed-height animated wrapper here — one row per group (GroupScheduleList) can
          // run to several lines, and the MultiSelectButton-only wrapper below is capped at a
          // height sized for one row of day buttons.
          <div className={styles.groupScheduleWrapper}>
            <GroupScheduleList
              fieldGroups={activeFieldGroups}
              onChange={editedActive =>
                onFieldGroupsChange(mergeEditedFieldGroups(fieldGroups, editedActive))
              }
            />
          </div>
        ) : (
          <a.div
            className={styles.weeklyHobbyContainer}
            style={{
              maxHeight: animationStyles.maxHeight,
            }}
          >
            <MultiSelectButton
              values={tempWeeklyHobbies}
              setValues={setTempWeeklyHobbies}
              options={[
                { label: 'Mon', value: Day.Mon },
                { label: 'Tue', value: Day.Tue },
                { label: 'Thu', value: Day.Thu },
                { label: 'Wed', value: Day.Wed },
                { label: 'Fri', value: Day.Fri },
                { label: 'Sat', value: Day.Sat },
                { label: 'Sun', value: Day.Sun },
              ]}
            />
          </a.div>
        )}
      </div>

      {/* Start Date Section */}
      {!hideStartDate && (
        <div className={styles.sectionContainer}>
          <List.ItemMeta
            logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
            noPaddingHorizontal
            title={intl.formatMessage({
              defaultMessage: 'Start Day',
              id: 'label-start-day.label',
            })}
            description={intl.formatMessage({
              defaultMessage: 'Select the first day',
              id: 'label-start-day.description',
            })}
            rightComponent={
              <DatePicker
                value={tempDate}
                onChange={e => setTempDate(e.target.value)}
                className={styles.dateInput}
              />
            }
          />
        </div>
      )}

      {/* Time Selector Section */}
      {!hasFieldGroups && (
        <div className={styles.sectionContainer}>
          <List.ItemMeta
            logo={<Icon width={24} icon="solar:clock-circle-line-duotone" />}
            noPaddingHorizontal
            title={intl.formatMessage({
              defaultMessage: 'Time',
              id: 'label-time.label',
            })}
            description={intl.formatMessage({
              defaultMessage: 'Select the time (optional)',
              id: 'label-time.description',
            })}
            rightComponent={
              <div className={styles.timeSelector}>
                <label className={styles.timeLabel}>
                  {intl.formatMessage({
                    defaultMessage: 'Hour',
                    id: 'label-time.hour',
                  })}
                  <select
                    value={tempHour}
                    onChange={handleTempHourChange}
                    className={styles.select}
                  >
                    <option value="">--</option>
                    {hourOptions.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <span className={styles.colon}>:</span>
                <label className={styles.timeLabel}>
                  {intl.formatMessage({
                    defaultMessage: 'Minute',
                    id: 'label-time.minute',
                  })}
                  <select
                    value={tempMinute}
                    onChange={handleTempMinuteChange}
                    className={styles.select}
                  >
                    <option value="">--</option>
                    {minuteOptions.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
};

export default ScheduleModalContent;
