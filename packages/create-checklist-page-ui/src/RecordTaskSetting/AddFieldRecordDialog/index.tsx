import Drawer from '@moon-ui/drawer';
import { Icon } from '@iconify/react';
import AddFieldRecord from '../AddFieldRecord';
import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';

const AddFieldRecordDialog = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const intl = useIntl();
  return (
    <Drawer className={styles.drawer} visible={visible} onBlur={onClose}>
      <div className={styles.header}>
        <Typography.Title noMargin level={3}>
          {intl.formatMessage({
            defaultMessage: 'Add more field to record',
            id: 'label-record-custom.title',
          })}
        </Typography.Title>
        <Icon
          width={32}
          icon="material-symbols:close-rounded"
          onClick={onClose}
        />
      </div>
      <AddFieldRecord className={styles.container} onSubmit={onClose} />
    </Drawer>
  );
};

export default AddFieldRecordDialog;
