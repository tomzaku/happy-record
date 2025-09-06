import Drawer from '@moon-ui/drawer';
import { Icon } from '@moon-ui/icon/Icon';
import AddFieldRecordUi from '../AddFieldRecordUi';
import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { RecordField } from '@dreamer/global/src/store/record-field';

const AddFieldRecordDialog = ({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (recordField: RecordField) => void;
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
      <AddFieldRecordUi className={styles.container} onSubmit={onSubmit} onCancel={onClose} />
    </Drawer>
  );
};

export default AddFieldRecordDialog;
