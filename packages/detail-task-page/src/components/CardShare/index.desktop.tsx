import React, { useState } from 'react';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Icon from '@moon-ui/icon/Icon';
import { Link } from 'react-router-dom';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { useCreateChecklistTemplate } from '@dreamer/global/src/hook/checklist-template/useCreateChecklistTemplateApi';
import { ChecklistTemplate, getActiveFieldGroups, useChallenge, useChecklistTemplates } from '@dreamer/global';
import styles from './index.desktop.module.scss';

// `from`/`to` ride along as query params rather than anything persisted
// server-side — they're just greeting text for the recipient's page, not
// data with a real owner, so there's nothing here worth a table or a column.
const getFullUrl = (checklistTemplateId: string, from = 'You', to = 'Friend') => {
  const domain = window.location.origin;
  const params = new URLSearchParams({ from, to });
  return `${domain}/#/checklist-template/shared/${checklistTemplateId}?${params}`;
};

type CardShareProps = {
  checklistTemplate: ChecklistTemplate;
  className?: string;
  isShared?: boolean;
};

const CardShareDesktop = ({ checklistTemplate }: CardShareProps) => {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const checklistTemplateId = checklistTemplate?.id;
  const { getRecordFieldsByIds } = useRecordField();
  const { updateChecklistTemplate } = useCreateChecklistTemplate();
  const { updateChecklistTemplate: updateChecklistTemplateLocal } =
    useChecklistTemplates();
  const { getChallengeForTemplate, setChallengeOptions } = useChallenge();
  const challenge = getChallengeForTemplate(checklistTemplateId);
  // Local until the first share (there's nothing to persist yet); once a
  // challenge row exists it's the source of truth, so this only seeds from
  // it — a later toggle writes straight through instead of drifting.
  const [shareRecords, setShareRecords] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  React.useEffect(() => {
    if (challenge) {
      setShareRecords(challenge.shareRecords);
      setCommentsEnabled(challenge.commentsEnabled);
    }
  }, [challenge]);
  const [shareUrl, setShareUrl] = useState(
    checklistTemplate.visibility === 'public'
      ? getFullUrl(checklistTemplateId)
      : '',
  );

  const handleShareClick = async () => {
    if (!shareUrl) {
      // Generate share URL when sharing
      await generateShareUrl();
    }
  };
  const isShared = !!shareUrl;

  const generateShareUrl = async () => {
    if (!checklistTemplateId) {
      return;
    }

    try {
      // Scoped to active groups only — an archived group's fields have no reason to be marked
      // public just because they're still physically present in the jsonb (see
      // FieldGroup.archivedAt). `data.checklistTemplate` below still carries the *whole*
      // `fieldGroups` array unmodified — this call writes back to the owner's own row, and
      // dropping archived groups from it here would permanently lose them.
      const checklistTemplateFieldIds = getActiveFieldGroups(checklistTemplate.fieldGroups).flatMap(
        group => group.fields,
      );
      const allFields = await getRecordFieldsByIds(checklistTemplateFieldIds);
      const data = {
        checklistTemplate: {
          ...checklistTemplate,
          visibility: 'public' as const,
        },
        fields: checklistTemplateFieldIds.map(id =>
          allFields.find(f => f.id === id),
        ),
      };
      const result = await updateChecklistTemplate(data);
      updateChecklistTemplateLocal(data.checklistTemplate);
      await setChallengeOptions(checklistTemplateId, { shareRecords, commentsEnabled });
      const fullUrl = getFullUrl(result.id);
      setShareUrl(fullUrl);
      handleCopyLink(fullUrl);
    } catch (err) {
      console.error('Failed to generate share URL:', err);
    }
  };

  // Already shared: a toggle writes straight through instead of waiting
  // for another "Generate URL" click that won't happen again.
  const handleToggleShareRecords = (checked: boolean) => {
    setShareRecords(checked);
    if (isShared) setChallengeOptions(checklistTemplateId, { shareRecords: checked, commentsEnabled });
  };
  const handleToggleComments = (checked: boolean) => {
    setCommentsEnabled(checked);
    if (isShared) setChallengeOptions(checklistTemplateId, { shareRecords, commentsEnabled: checked });
  };

  const handleCopyLink = async (url?: string) => {
    const urlToCopy = url || shareUrl;
    if (urlToCopy) {
      try {
        await navigator.clipboard.writeText(urlToCopy);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  return (
    <Card className={styles.container}>
      <div>
        <Typography.Title level={3} noMargin style={{ marginBottom: -6 }}>
          Share
        </Typography.Title>
        <Typography.Text>
          {isShared && shareUrl
            ? intl.formatMessage({
                id: 'CardShare.share-url-label',
                defaultMessage: 'Share URL:',
              })
            : intl.formatMessage({
                id: 'CardShare.share-description',
                defaultMessage: 'Generate a shareable link',
              })}
        </Typography.Text>
        <div className={styles.options}>
          <label className={styles.optionRow}>
            <Checkbox
              checked={shareRecords}
              onChange={e => handleToggleShareRecords(e.target.checked)}
            />
            <Typography.Text>
              {intl.formatMessage({
                id: 'CardShare.option-share-records',
                defaultMessage: "Share everyone's check-ins on a group dashboard",
              })}
            </Typography.Text>
          </label>
          <label className={styles.optionRow}>
            <Checkbox
              checked={commentsEnabled}
              onChange={e => handleToggleComments(e.target.checked)}
            />
            <Typography.Text>
              {intl.formatMessage({
                id: 'CardShare.option-comments',
                defaultMessage: 'Allow comments on this challenge',
              })}
            </Typography.Text>
          </label>
        </div>
        {!isShared && (
          <div>
            <Button size="md" onClick={handleShareClick}>
              {intl.formatMessage({
                id: 'CardShare.generate-url',
                defaultMessage: 'Generate URL',
              })}
            </Button>
          </div>
        )}
        {isShared && shareUrl && (
          <div className={styles.urlContainer}>
            <span className={styles.url}>{shareUrl}</span>
            <Button
              size="md"
              onClick={() => handleCopyLink()}
              className={styles.copyButton}
            >
              {copied
                ? intl.formatMessage({
                    id: 'CardShare.copied',
                    defaultMessage: 'Copied!',
                  })
                : intl.formatMessage({
                    id: 'CardShare.copy-link',
                    defaultMessage: 'Copy Link',
                  })}
            </Button>
            {challenge && (challenge.shareRecords || challenge.commentsEnabled) && (
              <Link to={`/challenge/${challenge.id}`} className={styles.dashboardLink}>
                {intl.formatMessage({
                  id: 'CardShare.view-dashboard',
                  defaultMessage: 'View Dashboard',
                })}
              </Link>
            )}
          </div>
        )}
      </div>

      {!isShared && (
        <Icon icon="solar:share-line-duotone" width={30} color="#00aaff" />
      )}
      <div className={styles.background} />
    </Card>
  );
};

export default CardShareDesktop;
