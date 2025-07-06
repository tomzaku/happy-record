import Drawer from '@moon-ui/drawer';
import { Icon } from '@moon-ui/icon/Icon';
import EditFieldRecord from '../EditFieldRecord';
import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { RecordField } from '@dreamer/global/src/store/record-field';

const EditFieldRecordDialog = ({
  visible,
  onClose,
  onSubmit,
  recordField,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (recordField: RecordField) => void;
  recordField: RecordField | null;
}) => {
  const intl = useIntl();
  return (
    <Drawer className={styles.drawer} visible={visible} onBlur={onClose}>
      <div className={styles.header}>
        <Typography.Title noMargin level={3}>
          {intl.formatMessage({
            defaultMessage: 'Edit field',
            id: 'label-record-edit.title',
          })}
        </Typography.Title>
        <Icon
          width={32}
          icon="material-symbols:close-rounded"
          onClick={onClose}
        />
      </div>
      <EditFieldRecord
        className={styles.container}
        onSubmit={onSubmit}
        recordField={recordField}
      />
    </Drawer>
  );
};

export default EditFieldRecordDialog;
