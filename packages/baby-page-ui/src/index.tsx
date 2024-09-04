import DatePicker from '@moon-ui/date-picker';
import Card from '@moon-ui/card';

import { useIntl } from '@dreamer/translation';
import { useBaby } from '@dreamer/global';

import styles from './index.module.scss';

const BabyPageUi = () => {
  const intl = useIntl();
  const { baby, setBaby, calculateStartDateFromDueDate } = useBaby();
  return (
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
  );
};

export default BabyPageUi;
