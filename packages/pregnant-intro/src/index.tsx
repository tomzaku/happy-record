import DatePicker from '@moon-ui/date-picker';
import { Icon } from '@iconify/react';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Card from '@moon-ui/card';

import { useIntl } from '@dreamer/translation';
import {
  useBaby,
  useChecklistTemplates,
  useLocalStorage,
} from '@dreamer/global';

import styles from './index.module.scss';

const PregnantIntro = () => {
  const [isNew, setIsNew] = useLocalStorage('user_new', false);
  const intl = useIntl();

  const { baby, setBaby, calculateStartDateFromDueDate } = useBaby();
  const {
    getRecommendChecklistTemplates,
    selectedChecklistTemplates: selectedChecklists,
    updateSelectedChecklistTemplate: updateSelectedChecklists,
  } = useChecklistTemplates();

  const onSubmit = () => {
    setIsNew(false);
    window.location.reload();
  };

  return (
    <>
      <div className={styles.container}>
        <Card className={styles.card}>
          <>
            <p className={styles.label}>
              {intl.formatMessage({
                id: 'PregnantIntro.label-enter-the-due-date',
                defaultMessage: "When's the little one's due date?",
              })}
            </p>
            <div className={styles.datePickerContainer}>
              <DatePicker
                value={
                  baby?.dueDate?.split('T')[0] ||
                  new Date(new Date().getTime() + 40 * 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0]
                }
                onChange={event =>
                  setBaby({
                    ...baby,
                    dueDate: event.target.value,
                    startDate: calculateStartDateFromDueDate(
                      event.target.value
                    ),
                  })
                }
                className={styles.datePicker}
              />
            </div>
          </>
        </Card>
        <Card className={styles.card}>
          <>
            <p className={styles.label}>
              {intl.formatMessage({
                id: 'PregnantIntro.checklists',
                defaultMessage: 'Ready for your daily pregnancy checklist?',
              })}
            </p>
            {getRecommendChecklistTemplates().map(({ id, title, avatar }) => (
              <div key={id} className={styles.checklistItem}>
                <Icon
                  color={avatar.color || '#8A8A8A'}
                  width={32}
                  height={32}
                  icon={avatar.name}
                />
                <p className={styles.checklistBody}>{title}</p>
                <Checkbox
                  checked={selectedChecklists.includes(id)}
                  onChange={event => {
                    const checked = event.target.checked;
                    if (checked) {
                      updateSelectedChecklists([...selectedChecklists, id]);
                    } else {
                      updateSelectedChecklists(
                        selectedChecklists.filter(i => i !== id)
                      );
                    }
                  }}
                  className={styles.checkbox}
                />
              </div>
            ))}
          </>
        </Card>
      </div>
      <div className={styles.footer} onClick={onSubmit}>
        <Button size="lg">Submit</Button>
      </div>
    </>
  );
};

export default PregnantIntro;
