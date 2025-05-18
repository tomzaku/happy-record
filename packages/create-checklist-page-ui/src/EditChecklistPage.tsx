import React from 'react';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import StartDaySelector from './StartDaySelector';
import BuildWeeklyHobby from './BuildWeeklyHobby';
import { Day } from '@dreamer/tasks-page-common';
import IconPicker from './IconPicker';
import Hr from './hr';

// Hooks
import { useIntl } from '@dreamer/translation';
import { useNavigate, useParams } from 'react-router-dom';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';

import styles from './index.module.scss';

const getDaysFromRepeat = (repeat?: { dayOfWeek: string }): Day[] => {
  if (!repeat?.dayOfWeek) return [new Date().getDay() as Day];
  if (repeat.dayOfWeek === '*') return [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];
  return repeat.dayOfWeek.split(',').map(day => {
    switch (day) {
      case '0': return Day.Sun;
      case '1': return Day.Mon;
      case '2': return Day.Tue;
      case '3': return Day.Wed;
      case '4': return Day.Thu;
      case '5': return Day.Fri;
      case '6': return Day.Sat;
      default: return Day.Sun;
    }
  });
};

const getDay = () => {
  const today = new Date();
  const days = [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];
  return days[today.getDay()];
};

const EditChecklistPage = () => {
  const { id } = useParams<{ id: string }>();
  const { checklistTemplate } = useChecklistTemplates();
  const template = checklistTemplate[id || ''];
  
  const [checklistText, setChecklistText] = React.useState(template?.title || '');
  const [weeklyHobbies, setWeeklyHobbies] = React.useState<Day[]>(
    getDaysFromRepeat(template?.repeat)
  );
  const [startedAt, setStartedAt] = React.useState(
    template?.repeat?.startedAt ? new Date(template.repeat.startedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = React.useState(
    template?.repeat?.hour ? `${template.repeat.hour}:${template.repeat.minute}` : '08:00'
  );
  const intl = useIntl();
  const [selectedIcon, setSelectedIcon] = React.useState(
    template?.avatar?.name || 'material-symbols:checklist'
  );
  const [selectedColor, setSelectedColor] = React.useState(
    template?.avatar?.color || '#607d8b'
  );
  const { updateChecklistTemplate } = useChecklistTemplates();
  const navigate = useNavigate();

  const calculateRepeat = () => {
    if (!weeklyHobbies || weeklyHobbies.length === 0) return undefined;

    const [hours, minutes] = time.split(':').map(Number);

    if (weeklyHobbies.length === 7)
      return {
        startedAt: new Date().toISOString(),
        dayOfWeek: '*',
        minute: minutes.toString(),
        hour: hours.toString(),
        dayOfMonth: '*',
        month: '*',
      };
    return {
      startedAt: new Date().toISOString(),
      minute: minutes.toString(),
      hour: hours.toString(),
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: weeklyHobbies
        .map(day => {
          switch (day) {
            case Day.Mon:
              return '1';
            case Day.Tue:
              return '2';
            case Day.Wed:
              return '3';
            case Day.Thu:
              return '4';
            case Day.Fri:
              return '5';
            case Day.Sat:
              return '6';
            case Day.Sun:
              return '0';
          }
        })
        .join(','),
    };
  };

  if (!template) {
    return (
      <div className={styles.container}>
        <Card className={styles.container}>
          <div className={styles.menu} />
          <div className={styles.input}>
            {intl.formatMessage({
              id: 'EditChecklist.label-not-found',
              defaultMessage: 'Checklist not found',
            })}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.container}>
        <div className={styles.menu} />
        <TextareaAutosize
          placeholder={intl.formatMessage({
            id: 'EditChecklist.label-edit-checklist-input-placeholder',
            defaultMessage: 'Edit your task here',
          })}
          className={styles.input}
          maxRows={3}
          autoFocus
          onChange={e => {
            setChecklistText(e.currentTarget.value);
          }}
          value={checklistText}
        />
        <hr className={styles.dashed} />
        <BuildWeeklyHobby values={weeklyHobbies} setValues={setWeeklyHobbies} />
        <Hr />
        <div className={styles.timeSelector}>
          <label className={styles.timeLabel}>
            {intl.formatMessage({
              id: 'EditChecklist.label-time',
              defaultMessage: 'Time',
            })}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={styles.timeInput}
          />
        </div>
        <Hr />
        <IconPicker
          selectedIcon={selectedIcon}
          setSelectedIcon={setSelectedIcon}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
        />
        <Hr />
        <StartDaySelector date={startedAt} setDate={setStartedAt} />
      </Card>
      <div className={styles.footer}>
        <div className={styles.footerCenter}>
          <Button
            type="primary"
            className={styles.submitButton}
            onClick={() => {
              const repeat = calculateRepeat();
              updateChecklistTemplate({
                id: template.id,
                title: checklistText,
                repeat,
                avatar: {
                  type: 'icon',
                  name: selectedIcon,
                  color: selectedColor,
                },
              });
              navigate('/');
            }}
          >
            {intl.formatMessage({
              id: 'EditChecklist.label-save',
              defaultMessage: 'SAVE',
            })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditChecklistPage; 