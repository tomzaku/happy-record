import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Icon from '@moon-ui/icon/Icon';
import { Modal, BottomModal } from '@moon-ui/modal';
import { useCreateChecklistTemplate } from '@dreamer/global/src/hook/checklist-template/useCreateChecklistTemplateApi';
import {
  ChecklistTemplate,
  getSharedChecklistTemplateUrl,
  useChallenge,
  useChecklistTemplates,
  useIsMobile,
  useSession,
} from '@dreamer/global';
import { SettingsRow } from '../SettingsCard';
import styles from './index.module.scss';

type CardShareProps = {
  checklistTemplate: ChecklistTemplate;
};

/**
 * One row, meant to be rendered as a child of ChecklistGenericInfo (inside its own General
 * Settings card, among its other rows) rather than in a card of its own — see that
 * component's own `children` slot. Not a desktop/mobile pair either: the row itself doesn't
 * need to look any different by device, only the confirm modal it opens (pre-share) does
 * (Modal vs BottomModal, same reasoning as AiChecklistGenerate).
 *
 * Deliberately just "do you want to challenge friends?" plus a Share button — no theme/target/
 * date/comments config here anymore. Every one of those is owner-only config for an *already
 * shared* challenge, so it belongs on the invite page's own config drawer
 * (checklist-template-shared-page-ui's ChallengeConfigDrawer, already gated to the owner there)
 * instead of cluttering the very first "do you want to do this at all" prompt. This component
 * writes sane defaults for all of it on first share and never touches those fields again —
 * once shared, this row's own onClick navigates to the invite page instead of reopening a modal.
 */
const CardShare = ({ checklistTemplate }: CardShareProps) => {
  const intl = useIntl();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  // Only ever asks once — "do you want to challenge friends?" — never reopened after the first
  // share (see the row's own onClick below).
  const [confirmVisible, setConfirmVisible] = useState(false);
  // Generating a share URL round-trips two requests (publish the template, then create the
  // challenge row) before there's anything to show — without this the "Share" click just sat
  // there with no feedback until both landed.
  const [generating, setGenerating] = useState(false);
  const checklistTemplateId = checklistTemplate?.id;
  const { updateChecklistTemplate } = useCreateChecklistTemplate();
  const { updateChecklistTemplate: updateChecklistTemplateLocal } = useChecklistTemplates();
  const { setChallengeOptions } = useChallenge();
  // The owner's name/photo on the group dashboard, straight from Google (see useSession.ts) — no
  // reason to ask them to type it again. Both `undefined` for an anonymous owner (joining a
  // challenge doesn't itself require signing in for the owner's own side), same as before this
  // existed: the participant row just gets saved with no name/photo.
  const { displayName, avatarUrl } = useSession();
  const [shareUrl, setShareUrl] = useState(
    checklistTemplate.visibility === 'public'
      ? getSharedChecklistTemplateUrl(checklistTemplateId)
      : '',
  );

  const isShared = !!shareUrl;

  const generateShareUrl = async () => {
    if (!checklistTemplateId) {
      return;
    }

    setGenerating(true);
    try {
      // Only the template's own visibility flips here now — a referenced field stays exactly as
      // private as it already was; the shared page resolves it a different way (`GET
      // /fields?templateId=`), authorized by this template being public, not by the field
      // itself becoming public for everyone (see useCreateChecklistTemplateApi.tsx's own
      // comment). `data.checklistTemplate` still carries the *whole* `fieldGroups` array
      // unmodified — this call writes back to the owner's own row, and dropping anything from it
      // here would permanently lose it.
      const data = {
        checklistTemplate: {
          ...checklistTemplate,
          visibility: 'public' as const,
        },
      };
      const result = await updateChecklistTemplate(data);
      updateChecklistTemplateLocal(data.checklistTemplate);
      // Sane defaults for everything a challenge needs — every one of these becomes editable
      // afterward from the invite page's own owner-only config drawer, never from here again
      // (see this file's own top comment on why).
      await setChallengeOptions(checklistTemplateId, {
        // Every challenge shares everyone's check-ins on the group dashboard now — there's no
        // private-roster mode, so this is no longer a checkbox (see the module's own history if
        // you need the old toggle).
        shareRecords: true,
        commentsEnabled: false,
        targets: [],
        theme: 'classic',
        backgroundImageUrl: null,
        greetingText: null,
        startWidgetLayout: 'countdown',
        greetingWidgetLayout: 'heading',
        targetsWidgetLayout: 'list',
        buttonWidgetLayout: 'plain',
        titleWidgetLayout: 'row',
        pageBackgroundLayout: 'solid',
        pageBackgroundImageUrl: null,
        glassOpacity: 12,
        startDate: new Date().toISOString(),
        endDate: null,
        ownerDisplayName: displayName,
        ownerAvatarUrl: avatarUrl,
      });
      const fullUrl = getSharedChecklistTemplateUrl(result.id);
      setShareUrl(fullUrl);
      handleCopyLink(fullUrl);
      setConfirmVisible(false);
    } catch (err) {
      console.error('Failed to generate share URL:', err);
    } finally {
      setGenerating(false);
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

  const modalContent = (
    <>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.badge}>
            <Icon width={18} icon="solar:share-line-duotone" color="#fff" />
          </div>
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'CardShare.share-button', defaultMessage: 'Share' })}
          </Typography.Title>
        </div>
        <Icon
          onClick={() => !generating && setConfirmVisible(false)}
          width={20}
          icon="basil:close-outline"
          className={styles.closeIcon}
        />
      </div>

      <div className={styles.body}>
        <Typography.Text>
          {intl.formatMessage({
            id: 'CardShare.confirm-message',
            defaultMessage: 'Do you want to challenge other friends?',
          })}
        </Typography.Text>
      </div>

      <div className={styles.footer}>
        <Button
          type="ghost"
          onClick={() => setConfirmVisible(false)}
          disabled={generating}
          className={styles.secondaryButton}
        >
          {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button
          onClick={generateShareUrl}
          disabled={generating}
          className={styles.gradientButton}
        >
          {generating && <Icon icon="svg-spinners:180-ring-with-bg" width={16} className={styles.buttonSpinner} />}
          {intl.formatMessage({ id: 'CardShare.share-button', defaultMessage: 'Share' })}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* No SettingsCard of its own — this row lives inside General Settings' own card now
          (ChecklistGenericInfo renders it as one of its own rows, via its `children` slot),
          not as a second card floating below it. */}
      <SettingsRow
        // Fixed hex, not a theme var like --icon-primary — that one shifts to teal in dark
        // mode, and the point here is specifically blue (matching the Share modal's own
        // badge/gradient), same reasoning Delete Task already hardcodes its red for.
        logo={<Icon width={24} icon="solar:share-line-duotone" color="#0b7dc2" />}
        title={intl.formatMessage({ id: 'CardShare.share-button', defaultMessage: 'Share' })}
        description={
          isShared ? (
            <span className={styles.urlText}>{shareUrl}</span>
          ) : (
            intl.formatMessage({
              id: 'CardShare.share-description',
              defaultMessage: 'Generate a shareable link',
            })
          )
        }
        rightComponent={
          isShared ? (
            // Copy stays a quick inline action; everything else (theme, target, dates,
            // comments) is owner-only config that now lives entirely on the invite page's own
            // config drawer instead — the row itself (onClick below) is what gets you there.
            <div className={styles.rightIcons}>
              <Icon
                width={16}
                icon={copied ? 'solar:check-circle-bold' : 'solar:copy-line-duotone'}
                className={styles.editIcon}
                onClick={e => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
              />
              <Icon width={16} icon="solar:alt-arrow-right-linear" />
            </div>
          ) : (
            // The whole row already opens the confirm modal (onClick below) — a "Share"
            // button here was a second, redundant way to do the exact same thing. A plain
            // chevron just says "this opens something," same as Archived Groups' own row.
            <Icon width={16} icon="solar:alt-arrow-right-linear" />
          )
        }
        onClick={() =>
          isShared
            ? navigate(`/checklist-template/shared/${checklistTemplateId}`)
            : setConfirmVisible(true)
        }
      />
      {/* No plain link here anymore on either device — MiniChallengeDashboard
          (rendered by index.desktop.tsx/index.mobile.tsx right next to
          ChecklistGenericInfo) replaces it everywhere with an actual
          leaderboard preview instead of just a link down to one. */}

      {/* Confirm modal — only ever shown before the first share (see the row's own onClick,
          which navigates to the invite page instead once shared). Same header/body/footer
          layout as AiChecklistGenerate's own modal, including the Modal-vs-BottomModal split
          by device — just a different (blue, not purple/pink) header gradient, since that
          combination is specifically the AI feature's own signature, not a generic "this is a
          nice modal" treatment to reuse verbatim everywhere. */}
      {isMobile ? (
        <BottomModal
          visible={confirmVisible}
          onDismiss={() => !generating && setConfirmVisible(false)}
          content={<div className={styles.mobileSheet}>{modalContent}</div>}
        />
      ) : (
        <Modal
          visible={confirmVisible}
          onDismiss={() => !generating && setConfirmVisible(false)}
          content={modalContent}
          className={styles.modalShell}
        />
      )}
    </>
  );
};

export default CardShare;
