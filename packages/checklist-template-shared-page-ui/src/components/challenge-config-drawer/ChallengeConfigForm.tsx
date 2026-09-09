// The actual editable fields for the owner's config drawer, split into two top-level sections:
// Configuration (plain data — start/end date, target numbers, allow-comments — everything a
// participant's actual experience depends on) and UI Changes (every layout/visual choice — a
// widget's own layout, theme, background, invitation message — none of which changes what the
// challenge does or when). A field with both a value and a layout (Start date, Target/Goal) has
// its value in Configuration and its layout in UI Changes, not both in one place. This is the
// ONLY place `endDate`/`commentsEnabled` are editable — both are owner-only config for an
// already-shared challenge, same reasoning as everything else here (see this drawer's own
// owner-only gate in index.tsx) — CardShare (packages/detail-task-page/src/components/CardShare)
// only ever writes fixed defaults for them on first share, never edits them again. `shareRecords`
// stays out of this form entirely — it's a fixed `true` everywhere now, not a real setting (see
// useChallenge.tsx's own comment). No shared component with CardShare — see the plan's own note
// on why.
import * as React from 'react';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Input from '@moon-ui/input';
import Icon from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';
import Slider from '@moon-ui/slider';
import {
  BUTTON_WIDGET_LAYOUTS,
  ButtonWidgetLayout,
  CHALLENGE_THEMES,
  CHALLENGE_THEME_SWATCH,
  Challenge,
  ChallengeThemeId,
  GREETING_WIDGET_LAYOUTS,
  GreetingWidgetLayout,
  PAGE_BACKGROUND_LAYOUTS,
  PageBackgroundLayout,
  START_WIDGET_LAYOUTS,
  StartWidgetLayout,
  TARGETS_WIDGET_LAYOUTS,
  TargetsWidgetLayout,
  TITLE_WIDGET_LAYOUTS,
  TitleWidgetLayout,
  localDateStringToISO,
} from '@dreamer/global';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { ChallengeConfigOptions } from '../../useChecklistTemplateSharedPage';
import { useChallengeStartCountdown } from '../../useChallengeStartCountdown';
import StartDateWidget from '../challenge-widgets/StartDateWidget';
import GreetingWidget from '../challenge-widgets/GreetingWidget';
import TargetsWidget from '../challenge-widgets/TargetsWidget';
import ButtonWidget from '../challenge-widgets/ButtonWidget';
import TitleWidget from '../challenge-widgets/TitleWidget';
import styles from './ChallengeConfigForm.module.scss';

const START_LAYOUT_LABELS: Record<StartWidgetLayout, string> = {
  countdown: 'Countdown',
  date: 'Plain date',
  both: 'Both',
};

const GREETING_LAYOUT_LABELS: Record<GreetingWidgetLayout, string> = {
  heading: 'Heading',
  banner: 'Banner',
  minimal: 'Minimal',
};

const TARGETS_LAYOUT_LABELS: Record<TargetsWidgetLayout, string> = {
  list: 'List',
  tiles: 'Tiles',
  combined: 'Combined',
};

const BUTTON_LAYOUT_LABELS: Record<ButtonWidgetLayout, string> = {
  plain: 'Plain',
  fire: 'Fire',
  water: 'Water',
  colorful: 'Colorful',
};

const TITLE_LAYOUT_LABELS: Record<TitleWidgetLayout, string> = {
  row: 'Row',
  stacked: 'Stacked',
  minimal: 'Minimal',
};

const PAGE_BACKGROUND_LAYOUT_LABELS: Record<PageBackgroundLayout, string> = {
  solid: 'Solid',
  glass: 'Glass',
};

// One row of small buttons — reused by all 3 widgets below, just with a different option set/
// labels/selection each time.
function LayoutPicker<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className={styles.layoutOptions}>
      {options.map(id => (
        <button
          key={id}
          type="button"
          className={cx(styles.layoutOption, value === id && styles.layoutOptionSelected)}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {labels[id]}
        </button>
      ))}
    </div>
  );
}

type Props = {
  challenge: Challenge;
  numberFields: RecordField[];
  // What the invite page's headline says with no override — also the greeting input's own
  // placeholder, so the owner sees exactly what visitors get if they leave it blank.
  defaultGreeting: string;
  // The checklist template's own title/icon — no text of its own to edit here (always the real
  // template title), only used for the title widget's live preview.
  templateTitle: string;
  templateIcon: string;
  onSave: (options: ChallengeConfigOptions) => Promise<void> | void;
  // Fires on every field edit — lets the page preview the change live before Save actually
  // persists it (see useChecklistTemplateSharedPage.ts's own draftChallengeOptions/previewChallenge).
  onChange: (options: ChallengeConfigOptions) => void;
  onCancel: () => void;
  saving: boolean;
};

const ChallengeConfigForm = ({
  challenge,
  numberFields,
  defaultGreeting,
  templateTitle,
  templateIcon,
  onSave,
  onChange,
  onCancel,
  saving,
}: Props) => {
  const [theme, setTheme] = React.useState<ChallengeThemeId>(challenge.theme);
  const [backgroundImageUrl, setBackgroundImageUrl] = React.useState(challenge.backgroundImageUrl ?? '');
  const [greetingText, setGreetingText] = React.useState(challenge.greetingText ?? '');
  const [greetingWidgetLayout, setGreetingWidgetLayout] = React.useState<GreetingWidgetLayout>(
    challenge.greetingWidgetLayout,
  );
  const [startDate, setStartDate] = React.useState(challenge.startDate);
  const [startWidgetLayout, setStartWidgetLayout] = React.useState<StartWidgetLayout>(challenge.startWidgetLayout);
  const [fieldTargets, setFieldTargets] = React.useState<Record<string, number>>(challenge.fieldTargets);
  const [targetsWidgetLayout, setTargetsWidgetLayout] = React.useState<TargetsWidgetLayout>(
    challenge.targetsWidgetLayout,
  );
  const [buttonWidgetLayout, setButtonWidgetLayout] = React.useState<ButtonWidgetLayout>(
    challenge.buttonWidgetLayout,
  );
  const [titleWidgetLayout, setTitleWidgetLayout] = React.useState<TitleWidgetLayout>(challenge.titleWidgetLayout);
  const [pageBackgroundLayout, setPageBackgroundLayout] = React.useState<PageBackgroundLayout>(
    challenge.pageBackgroundLayout,
  );
  const [pageBackgroundImageUrl, setPageBackgroundImageUrl] = React.useState(challenge.pageBackgroundImageUrl ?? '');
  const [glassOpacity, setGlassOpacity] = React.useState(challenge.glassOpacity);
  const [commentsEnabled, setCommentsEnabled] = React.useState(challenge.commentsEnabled);
  // '' means open-ended (null on the wire) — same convention as startDate/endDate elsewhere in
  // this app's date fields.
  const [endDate, setEndDate] = React.useState(challenge.endDate ?? '');
  // Which fields show a target row at all — not the same as "has a positive number in
  // fieldTargets": a field just added via "+ Add target" shows an empty row before the owner has
  // typed a number for it, so this needs its own state rather than being derived from
  // fieldTargets' own keys. Seeded from whatever already has a target set.
  const [visibleTargetFieldIds, setVisibleTargetFieldIds] = React.useState<string[]>(() =>
    Object.keys(challenge.fieldTargets),
  );
  const [addingTarget, setAddingTarget] = React.useState(false);
  // Previews exactly what visitors will see — same hook TaskSharedCard uses for the real page,
  // fed this form's own in-progress `startDate` rather than the saved one.
  const startCountdown = useChallengeStartCountdown(startDate);

  // Re-hydrates whenever a fresh challenge row lands (e.g. the drawer reopening after another
  // save elsewhere) — same shape as CardShare's own hydrate effect.
  React.useEffect(() => {
    setTheme(challenge.theme);
    setBackgroundImageUrl(challenge.backgroundImageUrl ?? '');
    setGreetingText(challenge.greetingText ?? '');
    setGreetingWidgetLayout(challenge.greetingWidgetLayout);
    setStartDate(challenge.startDate);
    setStartWidgetLayout(challenge.startWidgetLayout);
    setFieldTargets(challenge.fieldTargets);
    setTargetsWidgetLayout(challenge.targetsWidgetLayout);
    setButtonWidgetLayout(challenge.buttonWidgetLayout);
    setTitleWidgetLayout(challenge.titleWidgetLayout);
    setPageBackgroundLayout(challenge.pageBackgroundLayout);
    setPageBackgroundImageUrl(challenge.pageBackgroundImageUrl ?? '');
    setGlassOpacity(challenge.glassOpacity);
    setCommentsEnabled(challenge.commentsEnabled);
    setEndDate(challenge.endDate ?? '');
    setVisibleTargetFieldIds(Object.keys(challenge.fieldTargets));
    setAddingTarget(false);
  }, [challenge]);

  // `shareRecords`/`ownerDisplayName`/`ownerAvatarUrl` aren't editable here — they ride through
  // unchanged from `challenge` (this is a full upsert, setChallengeOptions/POST /challenges, so
  // omitting a field would silently clear it). Shared by the live-preview effect below and the
  // real Save, so both build the exact same shape.
  const buildOptions = (): ChallengeConfigOptions => ({
    shareRecords: challenge.shareRecords,
    commentsEnabled,
    endDate: endDate || null,
    ownerDisplayName: challenge.ownerDisplayName,
    ownerAvatarUrl: challenge.ownerAvatarUrl,
    theme,
    backgroundImageUrl: backgroundImageUrl.trim() || null,
    greetingText: greetingText.trim() || null,
    greetingWidgetLayout,
    startWidgetLayout,
    targetsWidgetLayout,
    buttonWidgetLayout,
    titleWidgetLayout,
    pageBackgroundLayout,
    pageBackgroundImageUrl: pageBackgroundImageUrl.trim() || null,
    glassOpacity,
    startDate,
    fieldTargets,
  });

  // Every edit reports the current draft upward immediately, so the page behind the drawer
  // previews it live rather than waiting for Save. Also fires once on mount/re-hydrate with
  // values that already match `challenge`, which is harmless (no visible diff) and keeps this one
  // effect the single path.
  React.useEffect(() => {
    onChange(buildOptions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    theme,
    backgroundImageUrl,
    greetingText,
    greetingWidgetLayout,
    startWidgetLayout,
    targetsWidgetLayout,
    buttonWidgetLayout,
    titleWidgetLayout,
    pageBackgroundLayout,
    pageBackgroundImageUrl,
    glassOpacity,
    startDate,
    fieldTargets,
    commentsEnabled,
    endDate,
  ]);

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

  const handleAddTarget = (fieldId: string) => {
    setVisibleTargetFieldIds(prev => [...prev, fieldId]);
    setAddingTarget(false);
  };

  const handleRemoveTarget = (fieldId: string) => {
    setVisibleTargetFieldIds(prev => prev.filter(id => id !== fieldId));
    setFieldTargets(prev => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const handleSave = () => onSave(buildOptions());

  const visibleTargetFields = numberFields.filter(f => visibleTargetFieldIds.includes(f.id));
  const fieldsAvailableToAdd = numberFields.filter(f => !visibleTargetFieldIds.includes(f.id));

  // Same shape TargetsWidget expects — built from this form's own in-progress state, not the
  // saved challenge, so the preview below tracks every edit live. Independent of
  // visibleTargetFieldIds: a row added but not yet given a number just doesn't show up here,
  // same as it wouldn't show up on the real page either.
  const targetsPreview = numberFields
    .filter(f => !!fieldTargets[f.id])
    .map(f => ({ fieldId: f.id, icon: f.icon, title: f.title, target: fieldTargets[f.id], unit: f.unit }));

  return (
    <div className={styles.form}>
      <div className={styles.body}>
        {/* SECTION 1: Configuration — plain data only (raw values a participant's experience
            actually depends on), nothing about how it looks. Layout/visual choices for the same
            fields (Start date's widget, Target/Goal's widget) live in Section 2 instead — see
            this file's own top comment on why the split. */}
        <div className={styles.mainSection}>
          <div className={styles.mainSectionHeader}>
            <div className={cx(styles.mainSectionBadge, styles.mainSectionBadgeConfig)}>
              <Icon width={16} icon="solar:settings-linear" color="#fff" />
            </div>
            <Typography.Title level={5} noMargin className={styles.mainSectionTitle}>
              Configuration
            </Typography.Title>
          </div>

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Start date
            </Typography.Title>
            <DatePicker value={startDate} onChange={e => setStartDate(localDateStringToISO(e.target.value))} />
          </div>

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              End date
            </Typography.Title>
            <DatePicker
              value={endDate}
              onChange={e => setEndDate(e.target.value ? localDateStringToISO(e.target.value) : '')}
            />
            {!!endDate && (
              <Button type="ghost" size="sm" onClick={() => setEndDate('')} className={styles.secondaryButton}>
                Clear end date
              </Button>
            )}
          </div>

          {!!numberFields.length && (
            <>
              <div className={styles.groupDivider} />
              <div className={styles.group}>
                <Typography.Title level={5} noMargin className={styles.groupTitle}>
                  Target / Goal
                </Typography.Title>

                {!!visibleTargetFields.length && (
                  <div className={styles.targetsCard}>
                    {visibleTargetFields.map((field, index) => (
                      <div
                        key={field.id}
                        className={cx(
                          styles.targetRow,
                          index === visibleTargetFields.length - 1 && styles.targetRowLast,
                        )}
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
                          placeholder="No target"
                          onChange={e => handleTargetChange(field.id, e.target.value)}
                          className={styles.targetInput}
                          classes={{ input: styles.targetInputField }}
                          suffix={field.unit || undefined}
                          renderRightInput={() => <></>}
                        />
                        <Icon
                          width={18}
                          icon="material-symbols:close-rounded"
                          className={styles.removeTargetIcon}
                          onClick={() => handleRemoveTarget(field.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {!!fieldsAvailableToAdd.length &&
                  (addingTarget ? (
                    <div className={styles.addTargetList}>
                      {fieldsAvailableToAdd.map(field => (
                        <button
                          key={field.id}
                          type="button"
                          className={styles.addTargetOption}
                          onClick={() => handleAddTarget(field.id)}
                        >
                          <Icon width={16} icon={field.icon} />
                          {field.title}
                        </button>
                      ))}
                      <button type="button" className={styles.addTargetCancel} onClick={() => setAddingTarget(false)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button type="button" className={styles.addTargetButton} onClick={() => setAddingTarget(true)}>
                      <Icon width={16} icon="material-symbols:add-rounded" />
                      Add target
                    </button>
                  ))}
              </div>
            </>
          )}

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <label className={styles.optionRow}>
              <Checkbox checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)} />
              <Typography.Text>Allow comments on this challenge</Typography.Text>
            </label>
          </div>
        </div>

        {/* SECTION 2: UI Changes — every visual/layout choice (a widget's own layout, theme,
            background, invitation message), none of which changes what the challenge actually
            does or when — that's all Section 1's job. */}
        <div className={styles.mainSection}>
          <div className={styles.mainSectionHeader}>
            <div className={cx(styles.mainSectionBadge, styles.mainSectionBadgeUi)}>
              <Icon width={16} icon="solar:palette-linear" color="#fff" />
            </div>
            <Typography.Title level={5} noMargin className={styles.mainSectionTitle}>
              UI Changes
            </Typography.Title>
          </div>

          {/* Title — no text of its own to edit (always the real template title), just its own
              layout, independent of the other widgets. */}
          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Title
            </Typography.Title>
            <LayoutPicker
              options={TITLE_WIDGET_LAYOUTS}
              labels={TITLE_LAYOUT_LABELS}
              value={titleWidgetLayout}
              onChange={setTitleWidgetLayout}
            />
            <div className={styles.widgetPreview}>
              <TitleWidget layout={titleWidgetLayout} icon={templateIcon} title={templateTitle} />
            </div>
          </div>

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Start date UI
            </Typography.Title>
            <LayoutPicker
              options={START_WIDGET_LAYOUTS}
              labels={START_LAYOUT_LABELS}
              value={startWidgetLayout}
              onChange={setStartWidgetLayout}
            />
            <div className={styles.widgetPreview}>
              <StartDateWidget layout={startWidgetLayout} countdown={startCountdown} />
            </div>
          </div>

          {!!numberFields.length && (
            <>
              <div className={styles.groupDivider} />
              <div className={styles.group}>
                <Typography.Title level={5} noMargin className={styles.groupTitle}>
                  Goal / Target layout
                </Typography.Title>
                <LayoutPicker
                  options={TARGETS_WIDGET_LAYOUTS}
                  labels={TARGETS_LAYOUT_LABELS}
                  value={targetsWidgetLayout}
                  onChange={setTargetsWidgetLayout}
                />
                {!!targetsPreview.length && (
                  <div className={styles.widgetPreview}>
                    <TargetsWidget layout={targetsWidgetLayout} targets={targetsPreview} />
                  </div>
                )}
              </div>
            </>
          )}

          <div className={styles.groupDivider} />

          {/* Take Challenge Button — no text/data of its own (always says "Take the Challenge"),
              just its own visual style, independent of the other widgets. */}
          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Take Challenge button
            </Typography.Title>
            <LayoutPicker
              options={BUTTON_WIDGET_LAYOUTS}
              labels={BUTTON_LAYOUT_LABELS}
              value={buttonWidgetLayout}
              onChange={setButtonWidgetLayout}
            />
            <div className={styles.widgetPreview}>
              <ButtonWidget layout={buttonWidgetLayout} onClick={() => {}} className={styles.buttonPreview}>
                Take the Challenge
              </ButtonWidget>
            </div>
          </div>

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Page theme
            </Typography.Title>
            <div className={styles.themeSwatches}>
              {CHALLENGE_THEMES.map(id => (
                <button
                  key={id}
                  type="button"
                  className={cx(styles.themeSwatch, theme === id && styles.themeSwatchSelected)}
                  style={{ background: CHALLENGE_THEME_SWATCH[id] }}
                  aria-label={id}
                  aria-pressed={theme === id}
                  onClick={() => setTheme(id)}
                />
              ))}
            </div>
          </div>

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Page background
            </Typography.Title>
            <LayoutPicker
              options={PAGE_BACKGROUND_LAYOUTS}
              labels={PAGE_BACKGROUND_LAYOUT_LABELS}
              value={pageBackgroundLayout}
              onChange={setPageBackgroundLayout}
            />
            {pageBackgroundLayout === 'glass' && (
              <div className={styles.glassOpacityRow}>
                <span className={styles.glassOpacityLabel}>Transparency</span>
                <Slider
                  className={styles.glassOpacitySlider}
                  value={glassOpacity}
                  onChange={value => setGlassOpacity(Array.isArray(value) ? value[0] : value)}
                  min={0}
                  max={100}
                  step={1}
                />
                <span className={styles.glassOpacityValue}>{glassOpacity}%</span>
              </div>
            )}
            {/* A small illustrative demo, not the real page — 'solid' shows an opaque card,
                'glass' shows a translucent, blurred panel at the chosen transparency, both over
                the same sample backdrop, so the difference is obvious without needing the whole
                page behind it. */}
            <div className={styles.pageBackgroundDemo}>
              <div
                className={cx(
                  styles.pageBackgroundPanel,
                  pageBackgroundLayout === 'glass' && styles.pageBackgroundPanelGlass,
                )}
                style={pageBackgroundLayout === 'glass' ? { background: `rgba(255, 255, 255, ${glassOpacity / 100})` } : undefined}
              />
            </div>
          </div>

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Corner background photo <span className={styles.optionalTag}>(optional)</span>
            </Typography.Title>
            <Input
              value={backgroundImageUrl}
              onChange={e => setBackgroundImageUrl(e.target.value)}
              placeholder="Paste an image URL — shown as a small accent in the corner, not the full page"
              renderRightInput={() => <></>}
            />
          </div>

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Full page background photo <span className={styles.optionalTag}>(optional)</span>
            </Typography.Title>
            <Input
              value={pageBackgroundImageUrl}
              onChange={e => setPageBackgroundImageUrl(e.target.value)}
              placeholder="Paste an image URL — covers the whole invitation page, most visible with Glass above"
              renderRightInput={() => <></>}
            />
          </div>

          <div className={styles.groupDivider} />

          <div className={styles.group}>
            <Typography.Title level={5} noMargin className={styles.groupTitle}>
              Invitation message <span className={styles.optionalTag}>(optional)</span>
            </Typography.Title>
            <Input
              value={greetingText}
              onChange={e => setGreetingText(e.target.value)}
              placeholder={defaultGreeting}
              maxLength={200}
              renderRightInput={() => <></>}
            />
            <LayoutPicker
              options={GREETING_WIDGET_LAYOUTS}
              labels={GREETING_LAYOUT_LABELS}
              value={greetingWidgetLayout}
              onChange={setGreetingWidgetLayout}
            />
            <div className={styles.widgetPreview}>
              <GreetingWidget layout={greetingWidgetLayout} text={greetingText.trim() || defaultGreeting} titleLevel={4} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button type="ghost" onClick={onCancel} disabled={saving} className={styles.secondaryButton}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving} className={styles.gradientButton}>
          {saving && <Icon icon="svg-spinners:180-ring-with-bg" width={16} className={styles.buttonSpinner} />}
          Save
        </Button>
      </div>
    </div>
  );
};

export default ChallengeConfigForm;
