import React from 'react';
import { ChecklistTemplate, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import BottomModal from '@moon-ui/modal/src/BottomModal';
import Button from '@moon-ui/button/src/DefaultButton';
import Division from '@moon-ui/division';
import { motion } from 'motion/react';
import { useIntl } from '@dreamer/translation';
import { Day } from '@dreamer/tasks-page-common';

// Import existing components for editing
import IconPicker from '@pregnant/create-checklist-page-ui/src/IconPicker';
import ColorPicker from '@pregnant/create-checklist-page-ui/src/ColorPicker';
import TagInput from '@pregnant/create-checklist-page-ui/src/TagInput';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { calculateRepeat } from '@pregnant/create-checklist-page-ui/src/calculateRepeat';
import { ScheduleModalContent } from '@pregnant/create-checklist-page-ui';

import styles from './index.module.scss';

type Props = {
  checklistTemplate: ChecklistTemplate;
  onUpdate: (template: ChecklistTemplate) => void;
};

enum EditModal {
  None,
  Icon,
  Schedule,
  Tags,
}

const ChecklistGenericInfo = ({ checklistTemplate, onUpdate }: Props) => {
  const intl = useIntl();
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const [activeModal, setActiveModal] = React.useState<EditModal>(
    EditModal.None,
  );

  // Form states for editing
  const [tempIcon, setTempIcon] = React.useState(
    checklistTemplate.avatar?.name || '',
  );
  const [tempColor, setTempColor] = React.useState(
    checklistTemplate.avatar?.color || '#607d8b',
  );
  const [tempStartDay, setTempStartDay] = React.useState(
    checklistTemplate.repeat?.startedAt
      ? new Date(checklistTemplate.repeat.startedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [tempTime, setTempTime] = React.useState(
    checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute
      ? `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`
      : '',
  );
  const [tempWeeklyHobbies, setTempWeeklyHobbies] = React.useState<Day[]>(
    getDaysFromRepeat(checklistTemplate.repeat),
  );
  const [tempTags, setTempTags] = React.useState<string[]>(
    checklistTemplate.tags || [],
  );

  const formatDisplayTime = () => {
    if (checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute) {
      return `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`;
    }
    return 'Not set';
  };

  const formatDisplayDays = () => {
    const days = getDaysFromRepeat(checklistTemplate.repeat);
    if (days.length === 0) return 'Not set';
    if (days.length === 7) return 'Every day';

    const dayNames = {
      [Day.Mon]: 'Mon',
      [Day.Tue]: 'Tue',
      [Day.Wed]: 'Wed',
      [Day.Thu]: 'Thu',
      [Day.Fri]: 'Fri',
      [Day.Sat]: 'Sat',
      [Day.Sun]: 'Sun',
    };

    return days.map(day => dayNames[day]).join(', ');
  };

  const formatDisplayStartDate = () => {
    if (checklistTemplate.repeat?.startedAt) {
      return new Date(checklistTemplate.repeat.startedAt).toLocaleDateString();
    }
    return 'Not set';
  };

  const formatDisplayTags = () => {
    if (!checklistTemplate.tags || checklistTemplate.tags.length === 0) {
      return 'No tags';
    }
    return checklistTemplate.tags.join(', ');
  };

  const handleSaveIcon = () => {
    onUpdate({
      ...checklistTemplate,
      avatar: {
        ...checklistTemplate.avatar,
        name: tempIcon,
        color: tempColor,
      },
    });
    setActiveModal(EditModal.None);
  };

  const handleSaveSchedule = () => {
    const repeat = calculateRepeat({
      weeklyHobbies: tempWeeklyHobbies,
      selectedTime: tempTime,
    });

    onUpdate({
      ...checklistTemplate,
      repeat: {
        ...repeat,
        startedAt: new Date(tempStartDay).toISOString(),
      },
    });
    setActiveModal(EditModal.None);
  };

  const handleSaveTags = () => {
    onUpdate({
      ...checklistTemplate,
      tags: tempTags,
    });
    setActiveModal(EditModal.None);
  };

  const resetModalStates = () => {
    setTempIcon(checklistTemplate.avatar?.name || '');
    setTempColor(checklistTemplate.avatar?.color || '#607d8b');
    setTempStartDay(
      checklistTemplate.repeat?.startedAt
        ? new Date(checklistTemplate.repeat.startedAt)
            .toISOString()
            .split('T')[0]
        : new Date().toISOString().split('T')[0],
    );
    setTempTime(
      checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute
        ? `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`
        : '',
    );
    setTempWeeklyHobbies(getDaysFromRepeat(checklistTemplate.repeat));
    setTempTags(checklistTemplate.tags || []);
  };

  const handleModalClose = () => {
    resetModalStates();
    setActiveModal(EditModal.None);
  };

  return (
    <>
      <Card className={styles.cardContainer}>
        <div
          className={styles.header}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className={styles.titleSection}>
            <Icon
              width={24}
              icon={checklistTemplate.avatar?.name || 'solar:settings-linear'}
              color={checklistTemplate.avatar?.color || '#607d8b'}
            />
            <Typography.Title level={4} noMargin>
              General Settings
            </Typography.Title>
          </div>
          <Icon
            width={20}
            icon={
              isCollapsed
                ? 'solar:alt-arrow-down-linear'
                : 'solar:alt-arrow-up-linear'
            }
          />
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isCollapsed ? 0 : 'auto',
            opacity: isCollapsed ? 0 : 1,
          }}
          transition={{
            height: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          style={{ overflow: 'hidden' }}
        >
          <div className={styles.content}>
            {/* Icon & Color */}
            <List.ItemMeta
              logo={<Icon width={24} icon="tdesign:icon" />}
              title="Icon & Color"
              description="Customize appearance"
              rightComponent={
                <div className={styles.displayRow}>
                  <Icon
                    width={24}
                    icon={
                      checklistTemplate.avatar?.name ||
                      'solar:question-circle-linear'
                    }
                    color={checklistTemplate.avatar?.color || '#607d8b'}
                  />
                  <Icon
                    width={16}
                    icon="solar:pen-2-line-duotone"
                    className={styles.editIcon}
                    onClick={() => {
                      resetModalStates();
                      setActiveModal(EditModal.Icon);
                    }}
                  />
                </div>
              }
              noPaddingHorizontal
              onClick={() => {
                resetModalStates();
                setActiveModal(EditModal.Icon);
              }}
            />

            {/* Schedule */}
            <List.ItemMeta
              logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
              title="Schedule"
              description={`${formatDisplayDays()} at ${formatDisplayTime()}`}
              rightComponent={
                <div className={styles.displayRow}>
                  <Typography.Text>{formatDisplayStartDate()}</Typography.Text>
                  <Icon
                    width={16}
                    icon="solar:pen-2-line-duotone"
                    className={styles.editIcon}
                    onClick={e => {
                      e.stopPropagation();
                      resetModalStates();
                      setActiveModal(EditModal.Schedule);
                    }}
                  />
                </div>
              }
              noPaddingHorizontal
              onClick={() => {
                resetModalStates();
                setActiveModal(EditModal.Schedule);
              }}
            />

            {/* Tags */}
            <List.ItemMeta
              logo={<Icon width={24} icon="solar:tag-broken" />}
              title="Tags"
              description={formatDisplayTags()}
              rightComponent={
                <Icon
                  width={16}
                  icon="solar:pen-2-line-duotone"
                  className={styles.editIcon}
                  onClick={e => {
                    e.stopPropagation();
                    resetModalStates();
                    setActiveModal(EditModal.Tags);
                  }}
                />
              }
              noPaddingHorizontal
              onClick={() => {
                resetModalStates();
                setActiveModal(EditModal.Tags);
              }}
            />
          </div>
        </motion.div>
      </Card>

      {/* Icon & Color Edit Modal */}
      <BottomModal
        visible={activeModal === EditModal.Icon}
        onDismiss={handleModalClose}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                Edit Icon & Color
              </Typography.Title>
            </div>
            <Division />
            <div className={styles.modalContent}>
              <IconPicker
                selectedIcon={tempIcon}
                setSelectedIcon={setTempIcon}
                selectedColor={tempColor}
                setSelectedColor={setTempColor}
                layout="two-line"
              />
            </div>
          </div>
        }
      />

      {/* Schedule Edit Modal */}
      <BottomModal
        visible={activeModal === EditModal.Schedule}
        onDismiss={handleModalClose}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                Edit Schedule
              </Typography.Title>
            </div>
            <Division />
            <ScheduleModalContent
              tempWeeklyHobbies={tempWeeklyHobbies}
              setTempWeeklyHobbies={setTempWeeklyHobbies}
              tempDate={tempStartDay}
              setTempDate={setTempStartDay}
              tempTime={tempTime}
              setTempTime={setTempTime}
              isDesktop={false}
            />
            <Division />
            <div className={styles.modalFooter}>
              <Button
                onClick={handleSaveSchedule}
                className={styles.saveButton}
              >
                Save
              </Button>
            </div>
          </div>
        }
      />

      {/* Tags Edit Modal */}
      <BottomModal
        visible={activeModal === EditModal.Tags}
        onDismiss={handleModalClose}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                Edit Tags
              </Typography.Title>
            </div>
            <Division />
            <div className={styles.modalContent}>
              <TagInput tags={tempTags} setTags={setTempTags} />
            </div>
          </div>
        }
      />
    </>
  );
};

export default ChecklistGenericInfo;
