import List from '@moon-ui/list';
import Input from '@moon-ui/input';
import Typography from '@moon-ui/typography';
import { Icon } from '@iconify/react';
import Button from '@moon-ui/button/src/DefaultButton';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import cx from 'classnames';

type Props = {
  className?: string;
};

const AddFieldRecord = ({ className }: Props) => {
  const intl = useIntl();
  return (
    <div className={cx(styles.container, className)}>
      <Typography.Title noMargin level={2} className={styles.title}>
        {intl.formatMessage({
          defaultMessage: 'Add more field to record',
          id: 'label-record-custom.title',
        })}
      </Typography.Title>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:text-field-linear" />}
        title={intl.formatMessage({
          defaultMessage: 'Field Name',
          id: 'label-record-custom.name.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'For example: Push-ups, Squats',
          id: 'label-record-custom.name.description',
        })}
        rightComponent={
          <Input border="solid" className={styles.customeFieldInput} />
        }
      />
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:text-field-linear" />}
        title={intl.formatMessage({
          defaultMessage: 'Field Unit',
          id: 'label-record-custom.unit.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'For example: minutes, hours, reps',
          id: 'label-record-custom.unit.description',
        })}
        rightComponent={
          <Input border="solid" className={styles.customeFieldInput} />
        }
      />
      <div className={styles.addFieldButtonContainer}>
        <Button type="primary">
          {intl.formatMessage({
            defaultMessage: 'Save',
            id: 'label-record-custom.save',
          })}
        </Button>
      </div>
    </div>
  );
};

export default AddFieldRecord;
