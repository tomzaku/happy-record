import React, { useState } from 'react';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Icon from '@moon-ui/icon/Icon';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { useCreateChecklistTemplate } from '@dreamer/global/src/hook/checklist-template/useCreateChecklistTemplateApi';
import { ChecklistTemplate, useChecklistTemplates } from '@dreamer/global';
import styles from './index.desktop.module.scss';

const getFullUrl = (checklistTemplateId: string) => {
  const domain = window.location.origin;
  const fullUrl = `${domain}/#/checklist-template/shared/${checklistTemplateId}`;
  return fullUrl;
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
  const { getAllRecordFields } = useRecordField();
  const { updateChecklistTemplate } = useCreateChecklistTemplate();
  const { updateChecklistTemplate: updateChecklistTemplateLocal } =
    useChecklistTemplates();
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
      const allFields = getAllRecordFields();
      const checklistTemplateFieldIds = checklistTemplate.fieldGroups.flatMap(
        group => group.fields,
      );
      const data = {
        checklistTemplate: {
          ...checklistTemplate,
          visibility: 'public' as const,
        },
        fields: checklistTemplateFieldIds.map(id =>
          allFields.find(f => f.id === id),
        ),
        userName: 'You', // Default values
        targetName: 'Friend',
      };
      const result = await updateChecklistTemplate(data);
      updateChecklistTemplateLocal(data.checklistTemplate);
      const fullUrl = getFullUrl(result.id);
      setShareUrl(fullUrl);
      handleCopyLink(fullUrl);
    } catch (err) {
      console.error('Failed to generate share URL:', err);
    }
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
