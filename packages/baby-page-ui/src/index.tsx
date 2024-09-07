import Button from '@moon-ui/button';
import DatePicker from '@moon-ui/date-picker';
import Card from '@moon-ui/card';

import { useIntl } from '@dreamer/translation';
import { useNavigate } from 'react-router-dom';
import { Gender, useBaby } from '@dreamer/global';

import cn from 'classnames';

import styles from './index.module.scss';

const BabyPageUi = () => {
  const intl = useIntl();
  const { baby, setBaby, calculateStartDateFromDueDate } = useBaby();
  const navigate = useNavigate();
  return (
    <div>
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
                  startDate: calculateStartDateFromDueDate(event.target.value),
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
              id: 'PregnantIntro.label-gender',
              defaultMessage:
                'Is this a sweet baby boy or a darling baby girl?',
            })}
          </p>
          <div className={styles.datePickerContainer}>
            <Button
              onClick={() => setBaby({ ...baby, gender: Gender.Male })}
              type="dash"
              size="lg"
              className={cn(
                styles.genderButton,
                baby?.gender === Gender.Male && styles.selectedButton
              )}
            >
              Boy
            </Button>
            <Button
              type="dash"
              size="lg"
              className={cn(
                styles.genderButton,
                baby?.gender === Gender.Female && styles.selectedButton
              )}
              onClick={() => setBaby({ ...baby, gender: Gender.Female })}
            >
              Girl
            </Button>
          </div>
        </>
      </Card>
      <div className={styles.footer}>
        <div className={styles.footerCenter}>
          <Button
            type="primary"
            className={styles.submitButton}
            onClick={() => {
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

export default BabyPageUi;
