import Button from '@moon-ui/button';
import styles from './index.module.scss';

import { useIntl } from '@dreamer/translation';
import { useNavigate } from 'react-router-dom';

const CreateChecklist = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  return (
    <div className={styles.addChecklist}>
      <Button
        onClick={() => {
          navigate('/create-checklist');
        }}
        type="dash"
        size="md"
        block
      >
        {intl.formatMessage({
          id: 'checklist-create.label-create-checklist',
          defaultMessage: 'Create Task',
        })}
      </Button>
    </div>
  );
};

export default CreateChecklist;
