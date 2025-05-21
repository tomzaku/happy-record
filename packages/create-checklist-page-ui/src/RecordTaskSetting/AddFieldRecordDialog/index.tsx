import Drawer from '@moon-ui/drawer';
import AddFieldRecord from '../AddFieldRecord';
import styles from './index.module.scss';

const AddFieldRecordDialog = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  return (
    <Drawer visible={visible} onBlur={onClose}>
      <AddFieldRecord className={styles.container}/>
    </Drawer>
  );
};

export default AddFieldRecordDialog;
