import { useChecklistTemplates, useSyncedSelector } from '@dreamer/global';
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
import { useCreateChecklistTemplate } from '@dreamer/global/src/hook/checklist-template/useCreateChecklistTemplateApi';

const TasksSharedPage = () => {
  const { id } = useParams<{ id: string }>();
  const [url, setUrl] = React.useState('');
  const { getChecklistTemplate } = useChecklistTemplates();
  const { getRecordFieldsByIds } = useRecordField();
  const [copied, setCopied] = React.useState(false);
  const [targetName, setTargetName] = React.useState('you');
  const [message, setMessage] = React.useState('');
  const [userName, setUserName] = React.useState('');
  const { updateChecklistTemplate } = useCreateChecklistTemplate();
  // Derived straight from the store's own function every render instead of
  // snapshotted into local state from an effect missing `getChecklistTemplate`
  // itself — a template edited elsewhere now actually shows up here.
  const checklistTemplate = useSyncedSelector(getChecklistTemplate, id ?? '');
  const handleCopy = (fullUrl: string) => {
    navigator.clipboard
      .writeText(fullUrl)
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
  const generateUrl = async () => {
    if (!id) {
      return;
    }
    const checklistTemplateFieldIds = checklistTemplate.fieldGroups.flatMap(
      group => group.fields,
    );
    const allFields = await getRecordFieldsByIds(checklistTemplateFieldIds);
    const data = {
      checklistTemplate: { ...checklistTemplate, visibility: 'public' as const },
      fields: checklistTemplateFieldIds.map(id =>
        allFields.find(f => f.id === id),
      ),
    };
    const result = await updateChecklistTemplate(data);
    const domain = window.location.origin;
    // `userName`/`targetName` are just greeting text for the recipient's
    // page — they ride along in the query string rather than anything
    // persisted server-side (see useCreateChecklistTemplateApi.tsx).
    const params = new URLSearchParams({
      from: userName || 'You',
      to: targetName || 'Friend',
    });
    const fullUrl = `${domain}/#/checklist-template/shared/${result.id}?${params}`;
    setUrl(fullUrl);
    handleCopy(fullUrl);
  };
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
          <Input value={url} readOnly className={styles.inputLink} />
          <Button onClick={generateUrl}>
            {copied ? 'Copied ' : 'Generate & Copy Url'}
          </Button>
        </div>
        <TaskSharedCard checklistTemplate={checklistTemplate} />
      </Card>
    </div>
  );
};

export default TasksSharedPage;
