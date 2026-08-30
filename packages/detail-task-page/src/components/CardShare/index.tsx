import React, { useState } from 'react';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Input from '@moon-ui/input';
import Icon from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import { Modal, BottomModal } from '@moon-ui/modal';
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
  useSession,
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
  // The config (checkboxes, theme, targets) is editable both before and after the first
  // share — the row itself only ever shows the url + copy/edit icons once shared, so the
  // actual checkboxes/theme picker/target inputs live in this modal, opened from the row
  // (pre-share) or its edit pencil (post-share) rather than sitting on the row permanently.
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
  // The owner's name/photo on the group dashboard, straight from Google
  // (see useSession.ts) — no reason to ask them to type it again. Both
  // `undefined` for an anonymous owner (joining a challenge doesn't itself
  // require signing in for the owner's own side), same as before this
  // existed: the participant row just gets saved with no name/photo.
  const { displayName, avatarUrl } = useSession();
  // Local until the first share (there's nothing to persist yet); once a challenge row
  // exists it's the source of truth, so this only seeds from it — a later toggle/edit
  // writes straight through instead of drifting.
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [fieldTargets, setFieldTargets] = useState<Record<string, number>>({});
  // Applies to every share link, not only a "real" challenge (every share is
  // one now — see generateShareUrl's own comment) — generateShareUrl below
  // always writes a challenges row, so theme is always there to pick.
  const [theme, setTheme] = useState<ChallengeThemeId>('classic');
  // A plain URL, not an upload (this app has no file-storage pipeline) — an
  // already-hosted photo shown behind the shared page in place of the
  // theme's own background. Optional; empty string means "use the theme".
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  React.useEffect(() => {
    if (challenge) {
      setCommentsEnabled(challenge.commentsEnabled);
      setFieldTargets(challenge.fieldTargets);
      setTheme(challenge.theme);
      setBackgroundImageUrl(challenge.backgroundImageUrl ?? '');
    }
  }, [challenge]);
  const [shareUrl, setShareUrl] = useState(
    checklistTemplate.visibility === 'public'
      ? getSharedChecklistTemplateUrl(checklistTemplateId)
      : '',
  );

  // The template's own number fields — a target is a shared goal ("100 push-ups"), which
  // only makes sense for a number. Fetched once per template (not gated on being already
  // shared, since targets can be set "before or after share" — see CLAUDE.md's
  // challenge_targets migration).
  const [numberFields, setNumberFields] = useState<RecordField[]>([]);
  React.useEffect(() => {
    const fieldIds = getActiveFieldGroups(checklistTemplate.fieldGroups).flatMap(group =>
      group.fields.map(f => f.fieldId),
    );
    if (!fieldIds.length) return;
    getRecordFieldsByIds(fieldIds).then(fields => setNumberFields(fields.filter(f => f.type === 'number')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistTemplate.fieldGroups]);

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
      await setChallengeOptions(checklistTemplateId, {
        // Every challenge shares everyone's check-ins on the group
        // dashboard now — there's no private-roster mode, so this is no
        // longer a checkbox (see the module's own history if you need the
        // old toggle).
        shareRecords: true,
        commentsEnabled,
        fieldTargets,
        theme,
        backgroundImageUrl: backgroundImageUrl.trim() || null,
        ownerDisplayName: displayName,
        ownerAvatarUrl: avatarUrl,
      });
      const fullUrl = getSharedChecklistTemplateUrl(result.id);
      setShareUrl(fullUrl);
      // Only auto-copy on the first share (the point where there's a brand-new link the
      // owner almost certainly wants on their clipboard right away) — re-opening this modal
      // afterward to change the theme or a target shouldn't clobber whatever's on the
      // clipboard just because Save was clicked.
      if (!isShared) handleCopyLink(fullUrl);
      setModalVisible(false);
    } catch (err) {
      console.error('Failed to generate share URL:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Only renders inside the share config modal (before or after the first share — see
  // isShared below), so there's no "write straight through" case to handle here either way —
  // generateShareUrl is what persists it, on submit.
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
        <div className={styles.themePicker}>
          <Typography.Text className={styles.themeLabel}>
            {intl.formatMessage({
              id: 'CardShare.background-image-label',
              defaultMessage: 'Background photo (optional)',
            })}
          </Typography.Text>
          <Input
            value={backgroundImageUrl}
            onChange={e => setBackgroundImageUrl(e.target.value)}
            placeholder={intl.formatMessage({
              id: 'CardShare.background-image-placeholder',
              defaultMessage: 'Paste an image URL — shown behind the theme',
            })}
            renderRightInput={() => <></>}
          />
        </div>
        {!!numberFields.length && (
          <div className={styles.targets}>
            <Typography.Text className={styles.targetsLabel}>
              {intl.formatMessage({
                id: 'CardShare.targets-label',
                defaultMessage: 'Group targets (optional)',
              })}
            </Typography.Text>
            {/* Same bordered-card, icon-badge row shell as the Select Fields list
                (ChecklistFieldGroupMenu's `.fieldIconBadge`) / CoreFieldRecord's form rows —
                a plain label+small-input pair read too cramped next to those, so each target
                gets the same field-row treatment the rest of the app uses. */}
            <div className={styles.targetsCard}>
              {numberFields.map((field, index) => (
                <div
                  key={field.id}
                  className={cx(styles.targetRow, index === numberFields.length - 1 && styles.targetRowLast)}
                >
                  <List.ItemMeta
                    noPaddingHorizontal
                    className={styles.targetItemMeta}
                    logo={
                      <div className={styles.targetIconBadge}>
                        <Icon width={18} icon={field.icon} />
                      </div>
                    }
                    title={field.title}
                  />
                  <Input
                    value={fieldTargets[field.id] ?? ''}
                    border="dash"
                    type="number"
                    placeholder={intl.formatMessage({ id: 'CardShare.no-target', defaultMessage: 'No target' })}
                    onChange={e => handleTargetChange(field.id, e.target.value)}
                    className={styles.targetInput}
                    classes={{ input: styles.targetInputField }}
                    suffix={field.unit || undefined}
                    renderRightInput={() => <></>}
                  />
                </div>
              ))}
            </div>
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
        <Button
          onClick={generateShareUrl}
          disabled={generating}
          className={styles.gradientButton}
        >
          {generating && <Icon icon="svg-spinners:180-ring-with-bg" width={16} className={styles.buttonSpinner} />}
          {isShared
            ? intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })
            : intl.formatMessage({ id: 'CardShare.share-button', defaultMessage: 'Share' })}
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
            // Edit pencil alongside copy once a link exists — the config (target, theme,
            // dashboard/comments toggles) stays editable after the first share, not just
            // before it; only the "generate a link" framing goes away, since there's already
            // one to keep. See generateShareUrl's own isShared branch for why Save here
            // doesn't re-copy the link to the clipboard the way the first share does.
            <div className={styles.rightIcons}>
              <Icon
                width={16}
                icon="solar:pen-2-line-duotone"
                className={styles.editIcon}
                onClick={e => {
                  e.stopPropagation();
                  setModalVisible(true);
                }}
              />
              <Icon
                width={16}
                icon={copied ? 'solar:check-circle-bold' : 'solar:copy-line-duotone'}
                className={styles.editIcon}
                onClick={e => {
                  e.stopPropagation();
                  handleCopyLink();
                }}
              />
            </div>
          ) : (
            // The whole row already opens the config modal (onClick below) — a "Share"
            // button here was a second, redundant way to do the exact same thing. A plain
            // chevron just says "this opens something," same as Archived Groups' own row.
            <Icon width={16} icon="solar:alt-arrow-right-linear" />
          )
        }
        onClick={() => setModalVisible(true)}
      />
      {/* No plain link here anymore on either device — MiniChallengeDashboard
          (rendered by index.desktop.tsx/index.mobile.tsx right next to
          ChecklistGenericInfo) replaces it everywhere with an actual
          leaderboard preview instead of just a link down to one. */}

      {/* Share config — reachable both before the first share (row's own onClick) and after
          (the row's edit pencil, once it exists), since the config itself (target, theme,
          dashboard/comments toggles) is never done changing just because a link was already
          generated. Same header/body/footer layout as AiChecklistGenerate's own modal,
          including the Modal-vs-BottomModal split by device — just a different (blue, not
          purple/pink) header gradient, since that combination is specifically the AI
          feature's own signature, not a generic "this is a nice modal" treatment to reuse
          verbatim everywhere. */}
      {/* `closeOnOverlayClick={false}` — real config lives here (target numbers per field,
          dashboard/comments toggles, theme), not just the `generating` guard's own async-safety
          window; a stray click on the backdrop shouldn't discard it any more than one on
          AiChecklistGenerate's own form should. */}
      {isMobile ? (
        <BottomModal
          visible={modalVisible}
          onDismiss={() => !generating && setModalVisible(false)}
          content={<div className={styles.mobileSheet}>{modalContent}</div>}
          closeOnOverlayClick={false}
        />
      ) : (
        <Modal
          visible={modalVisible}
          onDismiss={() => !generating && setModalVisible(false)}
          content={modalContent}
          className={styles.modalShell}
          closeOnOverlayClick={false}
        />
      )}
    </>
  );
};

export default CardShare;
