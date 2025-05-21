import React from 'react';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import StartDaySelector from './StartDaySelector';
import BuildWeeklyHobby from './BuildWeeklyHobby';
import { Day } from '@dreamer/tasks-page-common';
import IconPicker from './IconPicker';
import Hr from './hr';
import RecordTaskSetting from './RecordTaskSetting';

// Hooks
import { useIntl } from '@dreamer/translation';
import { useNavigate } from 'react-router-dom';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';

import styles from './index.module.scss';

const getDay = () => {
  const today = new Date();
  const days = [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];
  return days[today.getDay()];
};
const CreateChecklistPage = () => {
  const [selectedRecords, setSelectedRecords] = React.useState<string[]>([]);
  const [checklistText, setChecklistText] = React.useState('');
  const [weeklyHobbies, setWeeklyHobbies] = React.useState<Day[]>([getDay()]);
  const [startedAt, setStartedAt] = React.useState(
    new Date().toISOString().split('T')[0]
  );
  const intl = useIntl();
  const [selectedIcon, setSelectedIcon] = React.useState(
    'material-symbols:checklist'
  );
  const [selectedColor, setSelectedColor] = React.useState('#607d8b');
  const { addChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const navigate = useNavigate();

  const calculateRepeat = () => {
    if (!weeklyHobbies || weeklyHobbies.length === 0) return undefined;

    if (weeklyHobbies.length === 7)
      return {
        startedAt: new Date().toISOString(),
        dayOfWeek: '*',
        minute: '0',
        hour: '8',
        dayOfMonth: '*',
        month: '*',
      };
    return {
      startedAt: new Date().toISOString(),
      minute: '0',
      hour: '8',
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

  return (
    <div className={styles.container}>
      <Card className={styles.container}>
        <div className={styles.menu} />
        <TextareaAutosize
          placeholder={intl.formatMessage({
            id: 'CreateChecklist.label-create-checklist-input-placeholder',
            defaultMessage: 'Write your task here',
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
        <IconPicker
          selectedIcon={selectedIcon}
          setSelectedIcon={setSelectedIcon}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
        />
        <Hr />
        <StartDaySelector date={startedAt} setDate={setStartedAt} />
        <Hr />
        <RecordTaskSetting selectedRecords={selectedRecords} setSelectedRecords={setSelectedRecords} />
        
      </Card>
      <div className={styles.footer}>
        <div className={styles.footerCenter}>
          <Button
            type="primary"
            className={styles.submitButton}
            onClick={() => {
              const repeat = calculateRepeat();
              const { id } = addChecklistTemplate({
                title: checklistText,
                repeat,
                avatar: {
                  type: 'icon',
                  name: selectedIcon,
                  color: selectedColor,
                },
                records: selectedRecords
              });
              // If not repeat we need to create a checklist onetime.
              if (!repeat) {
                addChecklist({
                  title: checklistText,
                  checklistTemplateId: id,
                  startedAt,
                  endedAt: new Date(
                    new Date().setHours(23, 59, 59, 999)
                  ).toISOString(),
                });
              }
              navigate('/');
            }}
          >
            {intl.formatMessage({
              id: 'CreateChecklist.label-submit',
              defaultMessage: 'SUBMIT',
            })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateChecklistPage;
