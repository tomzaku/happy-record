import React, { useState } from 'react';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Input from '@moon-ui/input';
import Icon from '@moon-ui/icon/Icon';
import { Modal, BottomModal } from '@moon-ui/modal';
import { Link } from 'react-router-dom';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import { useCreateChecklistTemplate } from '@dreamer/global/src/hook/checklist-template/useCreateChecklistTemplateApi';
import {
  CHALLENGE_THEMES,
  CHALLENGE_THEME_SWATCH,
  ChallengeThemeId,
  ChecklistTemplate,
  getActiveFieldGroups,
  getSharedChecklistTemplateUrl,
  useChallenge,
  useChecklistTemplates,
  useIsMobile,
} from '@dreamer/global';
import { SettingsRow } from '../SettingsCard';
import styles from './index.module.scss';

// Copy for each theme — kept here (translated via intl) rather than beside
// CHALLENGE_THEME_SWATCH in the global store, which has no i18n access.
const THEME_COPY: Record<ChallengeThemeId, { labelId: string; label: string; descriptionId: string; description: string }> = {
  classic: {
    labelId: 'CardShare.theme-classic',
    label: 'Classic',
    descriptionId: 'CardShare.theme-classic-description',
    description: 'Clean and on-brand',
  },
  ignite: {
    labelId: 'CardShare.theme-ignite',
    label: 'Ignite',
    descriptionId: 'CardShare.theme-ignite-description',
    description: 'Bold and competitive',
  },
  playful: {
    labelId: 'CardShare.theme-playful',
    label: 'Playful',
    descriptionId: 'CardShare.theme-playful-description',
    description: 'Fun and low-pressure',
  },
};

type CardShareProps = {
  checklistTemplate: ChecklistTemplate;
};

/**
 * One row, meant to be rendered as a child of ChecklistGenericInfo (inside its own General
 * Settings card, among its other rows) rather than in a card of its own — see that
 * component's own `children` slot. Not a desktop/mobile pair either: the row itself doesn't
 * need to look any different by device, only the config modal it opens does (Modal vs
 * BottomModal, same reasoning as AiChecklistGenerate).
 */
const CardShare = ({ checklistTemplate }: CardShareProps) => {
  const intl = useIntl();
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  // The config (checkboxes, theme, targets) only matters before the first share — once
  // shared this row collapses to just the url + copy, so it lives in a modal opened from
  // the "Share" button rather than sitting on the row permanently.
  const [modalVisible, setModalVisible] = useState(false);
  // Generating a share URL round-trips two requests (publish the template, then
  // create/update the challenge row) before there's anything to show — without this the
  // "Share" click just sat there with no feedback until both landed.
  const [generating, setGenerating] = useState(false);
  const checklistTemplateId = checklistTemplate?.id;
  const { getRecordFieldsByIds } = useRecordField();
  const { updateChecklistTemplate } = useCreateChecklistTemplate();
  const { updateChecklistTemplate: updateChecklistTemplateLocal } = useChecklistTemplates();
  const { getChallengeForTemplate, setChallengeOptions } = useChallenge();
  const challenge = getChallengeForTemplate(checklistTemplateId);
  // Local until the first share (there's nothing to persist yet); once a challenge row
  // exists it's the source of truth, so this only seeds from it — a later toggle/edit
  // writes straight through instead of drifting.
  const [shareRecords, setShareRecords] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [fieldTargets, setFieldTargets] = useState<Record<string, number>>({});
  // Applies to every share link, not only a "real" challenge (shareRecords/commentsEnabled
  // on) — generateShareUrl below always writes a challenges row, so theme is always there
  // to pick even for a plain "take it" share.
  const [theme, setTheme] = useState<ChallengeThemeId>('classic');
  React.useEffect(() => {
    if (challenge) {
      setShareRecords(challenge.shareRecords);
      setCommentsEnabled(challenge.commentsEnabled);
      setFieldTargets(challenge.fieldTargets);
      setTheme(challenge.theme);
    }
  }, [challenge]);
  const [shareUrl, setShareUrl] = useState(
    checklistTemplate.visibility === 'public'
      ? getSharedChecklistTemplateUrl(checklistTemplateId)
      : '',
  );

  // The template's own metric fields — a target is a shared goal ("100 push-ups"), which
  // only makes sense for a number. Fetched once per template (not gated on being already
  // shared, since targets can be set "before or after share" — see CLAUDE.md's
  // challenge_targets migration).
  const [metricFields, setMetricFields] = useState<RecordField[]>([]);
  React.useEffect(() => {
    const fieldIds = getActiveFieldGroups(checklistTemplate.fieldGroups).flatMap(group =>
      group.fields.map(f => f.fieldId),
    );
    if (!fieldIds.length) return;
    getRecordFieldsByIds(fieldIds).then(fields => setMetricFields(fields.filter(f => f.type === 'metric')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistTemplate.fieldGroups]);

  const isShared = !!shareUrl;

  const generateShareUrl = async () => {
    if (!checklistTemplateId) {
      return;
    }

    setGenerating(true);
    try {
      // Scoped to active groups only — an archived group's fields have no reason to be marked
      // public just because they're still physically present in the jsonb (see
      // FieldGroup.archivedAt). `data.checklistTemplate` below still carries the *whole*
      // `fieldGroups` array unmodified — this call writes back to the owner's own row, and
      // dropping archived groups from it here would permanently lose them.
      const checklistTemplateFieldIds = getActiveFieldGroups(checklistTemplate.fieldGroups).flatMap(
        group => group.fields.map(f => f.fieldId),
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
      await setChallengeOptions(checklistTemplateId, { shareRecords, commentsEnabled, fieldTargets, theme });
      const fullUrl = getSharedChecklistTemplateUrl(result.id);
      setShareUrl(fullUrl);
      handleCopyLink(fullUrl);
      setModalVisible(false);
    } catch (err) {
      console.error('Failed to generate share URL:', err);
    } finally {
      setGenerating(false);
    }
  };

  // These only render inside the pre-share modal (see isShared below), so there's no
  // "already shared, write straight through" case to handle here — generateShareUrl is
  // what persists them, on submit.
  const handleToggleShareRecords = (checked: boolean) => setShareRecords(checked);
  const handleToggleComments = (checked: boolean) => setCommentsEnabled(checked);
  const handleTargetChange = (fieldId: string, value: string) => {
    const next = { ...fieldTargets };
    if (value.trim() === '') {
      delete next[fieldId];
    } else {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) next[fieldId] = num;
    }
    setFieldTargets(next);
  };
  const handleThemeChange = (next: ChallengeThemeId) => setTheme(next);

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

  const showDashboardLink = isShared && challenge && (challenge.shareRecords || challenge.commentsEnabled);

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
          onClick={() => !generating && setModalVisible(false)}
          width={20}
          icon="basil:close-outline"
          className={styles.closeIcon}
        />
      </div>

      <div className={styles.body}>
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
        <div className={styles.themePicker}>
          <Typography.Text className={styles.themeLabel}>
            {intl.formatMessage({ id: 'CardShare.theme-label', defaultMessage: 'Page theme' })}
          </Typography.Text>
          <div className={styles.themeSwatches}>
            {CHALLENGE_THEMES.map(id => {
              const copy = THEME_COPY[id];
              return (
                <button
                  key={id}
                  type="button"
                  className={cx(styles.themeSwatch, theme === id && styles.themeSwatchSelected)}
                  style={{ background: CHALLENGE_THEME_SWATCH[id] }}
                  title={intl.formatMessage({ id: copy.descriptionId, defaultMessage: copy.description })}
                  aria-label={intl.formatMessage({ id: copy.labelId, defaultMessage: copy.label })}
                  aria-pressed={theme === id}
                  onClick={() => handleThemeChange(id)}
                />
              );
            })}
          </div>
        </div>
        {!!metricFields.length && (
          <div className={styles.targets}>
            <Typography.Text className={styles.targetsLabel}>
              {intl.formatMessage({
                id: 'CardShare.targets-label',
                defaultMessage: 'Group targets (optional)',
              })}
            </Typography.Text>
            {metricFields.map(field => (
              <div key={field.id} className={styles.targetRow}>
                <Typography.Text className={styles.targetFieldName}>{field.title}</Typography.Text>
                <Input
                  value={fieldTargets[field.id] ?? ''}
                  border="dash"
                  type="number"
                  placeholder={intl.formatMessage({ id: 'CardShare.no-target', defaultMessage: 'No target' })}
                  onChange={e => handleTargetChange(field.id, e.target.value)}
                  className={styles.targetInput}
                  suffix={field.unit || undefined}
                  renderRightInput={() => <></>}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button
          type="ghost"
          onClick={() => setModalVisible(false)}
          disabled={generating}
          className={styles.secondaryButton}
        >
          {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button onClick={generateShareUrl} disabled={generating} className={styles.gradientButton}>
          {generating && <Icon icon="svg-spinners:180-ring-with-bg" width={16} className={styles.buttonSpinner} />}
          {intl.formatMessage({
            id: 'CardShare.share-button',
            defaultMessage: 'Share',
          })}
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
            <Icon
              width={16}
              icon={copied ? 'solar:check-circle-bold' : 'solar:copy-line-duotone'}
              className={styles.editIcon}
              onClick={e => {
                e.stopPropagation();
                handleCopyLink();
              }}
            />
          ) : (
            // The whole row already opens the config modal (onClick below) — a "Share"
            // button here was a second, redundant way to do the exact same thing. A plain
            // chevron just says "this opens something," same as Archived Groups' own row.
            <Icon width={16} icon="solar:alt-arrow-right-linear" />
          )
        }
        clickable={!isShared}
        onClick={() => {
          if (!isShared) setModalVisible(true);
        }}
      />
      {showDashboardLink && (
        <Link to={`/challenge/${challenge!.id}`} className={styles.dashboardLink}>
          {intl.formatMessage({ id: 'CardShare.view-dashboard', defaultMessage: 'View Dashboard' })}
        </Link>
      )}

      {/* Share config — only reachable pre-share; once shared the row above collapses to
          just the url + copy, so there's nothing left to reopen this for. Same header/body/
          footer layout as AiChecklistGenerate's own modal, including the Modal-vs-BottomModal
          split by device — just a different (blue, not purple/pink) header gradient, since
          that combination is specifically the AI feature's own signature, not a generic
          "this is a nice modal" treatment to reuse verbatim everywhere. */}
      {isMobile ? (
        <BottomModal
          visible={modalVisible}
          onDismiss={() => !generating && setModalVisible(false)}
          content={<div className={styles.mobileSheet}>{modalContent}</div>}
        />
      ) : (
        <Modal
          visible={modalVisible}
          onDismiss={() => !generating && setModalVisible(false)}
          content={modalContent}
          className={styles.modalShell}
        />
      )}
    </>
  );
};

export default CardShare;
