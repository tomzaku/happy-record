import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import Input from '@moon-ui/input';
import { Icon } from '@iconify/react';

import { useIntl } from '@dreamer/translation';
import styles from './index.module.scss';
import AddFieldRecord from './AddFieldRecord';

const RecordTaskSetting = () => {
  const intl = useIntl();
  return (
    <div>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:clock-square-broken" />}
        title={intl.formatMessage({
          defaultMessage: 'Duration',
          id: 'label-record-duration.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Set the duration for your recording session',
          id: 'label-record-duration.description',
        })}
        rightComponent={
          <>
            <Input
              type="number"
              className={styles.durationInput}
              border="dash"
              placeholder="0"
              // value={duration === 0 ? '' : duration}
              // onChange={e => {
              //   const value = e.currentTarget.value;
              //   if (Number(value) || value === '') {
              //     setDuration(Number(e.currentTarget.value));
              //   }
              // }}
              // onKeyPress={e => {
              //   if (e.key === 'Enter') {
              //     addTask();
              //   }
              // }}
            />
            <Typography.Text>
              {intl.formatMessage({
                id: 'label-record-duration.unit',
                defaultMessage: 'minutes',
              })}
            </Typography.Text>
          </>
        }
      />
      <AddFieldRecord />
    </div>
  );
};

export default RecordTaskSetting
