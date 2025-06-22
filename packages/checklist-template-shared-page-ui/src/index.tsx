import React from 'react';
import {
  ChecklistTemplate,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import AppHeader, { BackHeader } from '@dreamer/header';
import qs from 'qs';
import { useParams } from 'react-router-dom';
import TaskSharedCard from './components/task-shared-card';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button/src/DefaultButton';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { useNavigate } from 'react-router-dom';
import NoteEditor from '@dreamer/detail-task-page/src/components/note/NoteEditor/indexv2';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';
import Drawer from '@moon-ui/drawer';
import Icon from '@moon-ui/icon/Icon';

const ChecklistTemplateSharedPageUi = () => {
  const { getAllRecordFields, addRecordField } = useRecordField();
  const [dialogRejectOpen, setDialogRejectOpen] = React.useState(false);
  const { addChecklistTemplate } = useChecklistTemplates();
  const { getChecklistDetail } = useChecklist();
  const navigate = useNavigate();

  const queryParams = qs.parse(location.search, { ignoreQueryPrefix: true });
  const handleSubmit = () => {
    const allFields = getAllRecordFields();
    const newFields = queryParams.fields.filter(f => {
      return !allFields.find(existingField => existingField.id == f.id);
    });
    newFields.forEach(f => {
      addRecordField(f, true);
    });
    if (!getChecklistDetail(queryParams.checklistTemplate.id)) {
      alert("You've have this task!!!");
    } else {
      addChecklistTemplate(queryParams.checklistTemplate);
      navigate('/');
    }
  };

  const onClickLeaveIt = () => {
    setDialogRejectOpen(true);
  };

  return (
    <div>
      <AppHeader />
      <Card className={styles.card}>
        <Typography.Title
          level={3}
        >{`Hey, ${queryParams.targetName} - ${queryParams.userName} just challenged you!`}</Typography.Title>
        <TaskSharedCard
          checklistTemplate={queryParams.checklistTemplate}
          fields={queryParams.fields}
        />
        <div className={styles.footerContainer}>
          <Button onClick={handleSubmit} className={styles.button}>
            Take it
          </Button>
          <Typography.Text className={styles.orText}>or</Typography.Text>
          <Button onClick={onClickLeaveIt} className={styles.buttonLeaveIt}>
            Leave it
          </Button>
        </div>
      </Card>
      <Drawer
        visible={dialogRejectOpen}
        className={styles.drawerContainer}
        onBlur={() => setDialogRejectOpen(false)}
      >
        <div className={styles.header}>
          <Typography.Title noMargin level={2}>
            Are you sure? Or just a misclick
          </Typography.Title>

          <Icon
            width={32}
            icon="material-symbols:close-rounded"
            onClick={() => setOpenRename(false)}
          />
        </div>
        <Typography.Title level={3}>
          {`Don't worry, ${queryParams.targetName}`}
        </Typography.Title>
        <Typography.Text>
          I know you not scared of this challenge. So I will take it for you in
          5s
        </Typography.Text>
      </Drawer>
    </div>
  );
};

export default ChecklistTemplateSharedPageUi;
