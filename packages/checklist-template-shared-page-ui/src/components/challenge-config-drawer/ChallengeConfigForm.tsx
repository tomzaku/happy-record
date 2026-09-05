// The actual editable fields for the owner's config drawer — theme, background photo, start
// date, and per-number-field targets. Deliberately a subset of what CardShare
// (packages/detail-task-page/src/components/CardShare) already edits for the same `Challenge`
// row: no endDate/commentsEnabled/shareRecords here, scoped down to exactly what the invite page
// itself asked for. No shared component with CardShare — see the plan's own note on why.
import * as React from 'react';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import Icon from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';
import { CHALLENGE_THEMES, CHALLENGE_THEME_SWATCH, Challenge, ChallengeThemeId, localDateStringToISO } from '@dreamer/global';
import type { RecordField } from '@dreamer/global/src/store/record-field';
import type { ChallengeConfigOptions } from '../../useChecklistTemplateSharedPage';
import styles from './ChallengeConfigForm.module.scss';

type Props = {
  challenge: Challenge;
  numberFields: RecordField[];
  onSave: (options: ChallengeConfigOptions) => Promise<void> | void;
  // Fires on every field edit — lets the page preview the change live before Save actually
  // persists it (see useChecklistTemplateSharedPage.ts's own draftChallengeOptions/previewChallenge).
  onChange: (options: ChallengeConfigOptions) => void;
  onCancel: () => void;
  saving: boolean;
};

const ChallengeConfigForm = ({ challenge, numberFields, onSave, onChange, onCancel, saving }: Props) => {
  const [theme, setTheme] = React.useState<ChallengeThemeId>(challenge.theme);
  const [backgroundImageUrl, setBackgroundImageUrl] = React.useState(challenge.backgroundImageUrl ?? '');
  const [startDate, setStartDate] = React.useState(challenge.startDate);
  const [fieldTargets, setFieldTargets] = React.useState<Record<string, number>>(challenge.fieldTargets);

  // Re-hydrates whenever a fresh challenge row lands (e.g. the drawer reopening after another
  // save elsewhere) — same shape as CardShare's own hydrate effect.
  React.useEffect(() => {
    setTheme(challenge.theme);
    setBackgroundImageUrl(challenge.backgroundImageUrl ?? '');
    setStartDate(challenge.startDate);
    setFieldTargets(challenge.fieldTargets);
  }, [challenge]);

  // Everything not editable here rides through unchanged from `challenge` — this is a full
  // upsert (setChallengeOptions/POST /challenges), so omitting a field would silently clear it.
  // Shared by the live-preview effect below and the real Save, so both build the exact same shape.
  const buildOptions = (): ChallengeConfigOptions => ({
    shareRecords: challenge.shareRecords,
    commentsEnabled: challenge.commentsEnabled,
    endDate: challenge.endDate,
    ownerDisplayName: challenge.ownerDisplayName,
    ownerAvatarUrl: challenge.ownerAvatarUrl,
    theme,
    backgroundImageUrl: backgroundImageUrl.trim() || null,
    startDate,
    fieldTargets,
  });

  // Every edit — theme swatch, background URL keystroke, date pick, target number — reports the
  // current draft upward immediately, so the page behind the drawer previews it live rather than
  // waiting for Save. Also fires once on mount/re-hydrate with values that already match
  // `challenge`, which is harmless (no visible diff) and keeps this one effect the single path.
  React.useEffect(() => {
    onChange(buildOptions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, backgroundImageUrl, startDate, fieldTargets]);

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

  const handleSave = () => onSave(buildOptions());

  return (
    <div className={styles.form}>
      <div className={styles.body}>
        <div className={styles.section}>
          <Typography.Text className={styles.label}>Page theme</Typography.Text>
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

        <div className={styles.section}>
          <Typography.Text className={styles.label}>Background photo (optional)</Typography.Text>
          <Input
            value={backgroundImageUrl}
            onChange={e => setBackgroundImageUrl(e.target.value)}
            placeholder="Paste an image URL — shown behind the theme"
            renderRightInput={() => <></>}
          />
        </div>

        <div className={styles.section}>
          <Typography.Text className={styles.label}>Start date</Typography.Text>
          <DatePicker value={startDate} onChange={e => setStartDate(localDateStringToISO(e.target.value))} />
        </div>

        {!!numberFields.length && (
          <div className={styles.section}>
            <Typography.Text className={styles.label}>Group targets (optional)</Typography.Text>
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
                    placeholder="No target"
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
