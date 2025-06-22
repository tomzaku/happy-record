import { ChecklistTemplate, useChecklistTemplates } from '@dreamer/global';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import Card from '@moon-ui/card';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import qs from 'qs';
import TaskSharedCard from './components/task-share-card';
import { BackHeader } from '@dreamer/header';
import Button from '@moon-ui/button/src/DefaultButton';
import styles from './index.module.scss';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';

const TasksSharedPage = () => {
  const { id } = useParams<{ id: string }>();
  const [url, setUrl] = React.useState('');
  const { getChecklistTemplate } = useChecklistTemplates();
  const { getAllRecordFields } = useRecordField();
  const [copied, setCopied] = React.useState(false);
  const [targetName, setTargetName] = React.useState('dude');
  const [message, setMessage] = React.useState('');
  const [userName, setUserName] = React.useState('');
  const [checklistTemplate, setChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  React.useEffect(() => {
    if (id) {
      const allFields = getAllRecordFields();
      const checklistTemplate = getChecklistTemplate(id);
      setChecklistTemplate(checklistTemplate);
      const checklistTemplateFieldIds = checklistTemplate.fieldGroups.flatMap(
        group => group.fields,
      );
      const params = {
        checklistTemplate,
        fields: checklistTemplateFieldIds.map(id =>
          allFields.find(f => f.id === id),
        ),
      };
      const domain = window.location.origin;

      setUrl(`${domain}/checklist-template/shared?${qs.stringify(params)}`);
    }
  }, [id]);
  const handleCopy = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  if (!checklistTemplate) {
    return;
  }
  return (
    <div>
      <BackHeader
        renderLeftComponent={() => (
          <Typography.Title level={4} noMargin>
            Challenge/ Share to your friends
          </Typography.Title>
        )}
      />
      <Card className={styles.card}>
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:people-nearby-line-duotone" />}
          title={'Your Name'}
          description="Tell me your name"
        />
        <Input
          border="solid"
          className={styles.input}
          value={userName}
          onChange={e => setUserName(e.target.value)}
        />
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:people-nearby-line-duotone" />}
          title={"Your friend's name"}
          description="Tell me your friend's name to invite"
        />
        <Input
          border="solid"
          className={styles.input}
          value={targetName}
          onChange={e => setTargetName(e.target.value)}
        />
        <List.ItemMeta
          logo={<Icon width={24} icon="duo-icons:message-3" />}
          title={'Message'}
          description="Write a message to your friend to take this challenge"
        />
        <Input
          border="solid"
          className={styles.input}
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      </Card>
      <Card className={styles.card}>
        <div className={styles.inputContainer}>
          <Input value={url} readOnly className={styles.input} />
          <Button onClick={handleCopy}>
            {copied ? 'Copied ' : 'Copy Link'}
          </Button>
        </div>
        <TaskSharedCard checklistTemplate={checklistTemplate} />
      </Card>
    </div>
  );
};

export default TasksSharedPage;
