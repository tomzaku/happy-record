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
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';
import Drawer from '@moon-ui/drawer';
import Icon from '@moon-ui/icon/Icon';
import Timer from './components/timer';
import { useGetChecklistTemplateApi } from '@dreamer/global/src/hook/checklist-template/useGetChecklistTemplateApi';

const ChecklistTemplateSharedPageUi = () => {
  const { id } = useParams<{ id: string }>();
  const { getAllRecordFields, addRecordField } = useRecordField();
  const [dialogRejectOpen, setDialogRejectOpen] = React.useState(false);
  const { addChecklistTemplate, getChecklistTemplate } =
    useChecklistTemplates();
  const { getChecklistDetail } = useChecklist();
  const navigate = useNavigate();
  const { getChecklistTemplateApi } = useGetChecklistTemplateApi();

  // const queryParams = qs.parse(location.search, { ignoreQueryPrefix: true });
  const [data, setData] = React.useState();
  const handleSubmit = () => {
    const allFields = getAllRecordFields();
    const newFields = data.fields.filter(f => {
      return !allFields.find(existingField => existingField.id == f.id);
    });
    newFields.forEach(f => {
      addRecordField(f, true);
    });
    if (getChecklistTemplate(data.checklistTemplate.id)) {
      alert("You've have this task!!!");
    } else {
      addChecklistTemplate(data.checklistTemplate);
      navigate('/');
    }
  };

  const onClickLeaveIt = () => {
    setDialogRejectOpen(true);
  };
  const fetchApi = async () => {
    if (id) {
      const result = await getChecklistTemplateApi(id);
      setData(result);
    }
  };
  React.useEffect(() => {
    console.log('ID', id);
    fetchApi();
  }, [id]);
  if (!data) {
    return null;
  }

  return (
    <div>
      <AppHeader />
      <Card className={styles.card}>
        <Typography.Title
          level={3}
        >{`Hey, ${data.targetName} - ${data.userName} just challenged you!`}</Typography.Title>
        <TaskSharedCard
          checklistTemplate={data.checklistTemplate}
          fields={data.fields}
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
        <div>
          <div className={styles.header}>
            <Typography.Title noMargin level={2}>
              Are you sure? Or just a misclick
            </Typography.Title>

            <Icon
              width={32}
              icon="material-symbols:close-rounded"
              onClick={() => setDialogRejectOpen(false)}
            />
          </div>
          <Typography.Title level={3}>
            {`Don't worry, ${data.targetName}`}
          </Typography.Title>
          <Typography.Text>
            I know you’re not scared of this challenge, so I’ll take it for you
            in 10 seconds.
          </Typography.Text>
          <Timer duration={10000} onFinish={handleSubmit} autoStart />
        </div>
      </Drawer>
    </div>
  );
};

export default ChecklistTemplateSharedPageUi;
