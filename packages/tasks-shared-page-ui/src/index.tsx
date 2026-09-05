import {
  getSharedChecklistTemplateUrl,
  useChecklistTemplateDetail,
} from '@dreamer/global';
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
  const [copied, setCopied] = React.useState(false);
  const [targetName, setTargetName] = React.useState('you');
  const [message, setMessage] = React.useState('');
  const [userName, setUserName] = React.useState('');
  const { updateChecklistTemplate } = useCreateChecklistTemplate();
  // A real per-id query — re-renders whenever this template's own data changes, without needing
  // the useSyncedSelector wrapper a plain callback read would.
  const { template: checklistTemplate } = useChecklistTemplateDetail(id);
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
    // This `updateChecklistTemplate` call writes back to the owner's own template row (sharing
    // works by flipping that row's own `visibility`, not by making a separate copy — see
    // CLAUDE.md's sharing-flow section) — so `checklistTemplate.fieldGroups` itself must go
    // through unmodified, archived groups included, or sharing would permanently strip them
    // from the owner's own data and defeat the entire point of a soft delete being recoverable.
    // Only the template's own visibility flips — a referenced field stays exactly as private as
    // it already was; the shared page resolves it via `GET /fields?templateId=` instead,
    // authorized by this template being public (see useCreateChecklistTemplateApi.tsx's own
    // comment for why sharing no longer flips the field itself public).
    const data = {
      checklistTemplate: { ...checklistTemplate, visibility: 'public' as const },
    };
    const result = await updateChecklistTemplate(data);
    const fullUrl = getSharedChecklistTemplateUrl(result.id, userName, targetName);
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
