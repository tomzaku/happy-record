import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Toggle from '@moon-ui/toggle';
import { Modal } from '@moon-ui/modal';
import { useIntl } from '@dreamer/translation';
import {
  ApiError,
  ChecklistTemplate,
  useIsPro,
  useRecordField,
  useApplyAiChecklistTemplate,
  generateChecklistTemplate,
  type AiGeneratedChecklistTemplate,
} from '@dreamer/global';
import styles from './index.module.scss';

type Mode = 'new' | 'existing';
type Phase = 'prompt' | 'loading' | 'review' | 'error';

interface AiChecklistGenerateProps {
  visible: boolean;
  onDismiss: () => void;
  mode: Mode;
  /** Required when `mode === 'existing'` — the template new groups get appended to. */
  existingTemplate?: ChecklistTemplate;
  onApplied?: (result: { id?: string; template?: ChecklistTemplate }) => void;
}

/**
 * The single AI entry point shared by the task detail page ("add to this template") and the
 * Home tab ("generate a new template") — see packages/global/src/hook/useApplyAiChecklistTemplate
 * for what actually happens on Accept, and supabase/functions/ai-checklist-template for what
 * generates the proposal. Pro-gated: the server is the real enforcement (a 403 there), this is
 * just the UX gate so a non-Pro user sees an upsell instead of a prompt they can't use.
 */
const AiChecklistGenerate = ({
  visible,
  onDismiss,
  mode,
  existingTemplate,
  onApplied,
}: AiChecklistGenerateProps) => {
  const intl = useIntl();
  const { isPro } = useIsPro();
  const { getAllRecordFields } = useRecordField();
  const { applyAsNewTemplate, applyToExistingTemplate } = useApplyAiChecklistTemplate();

  const [phase, setPhase] = React.useState<Phase>('prompt');
  const [prompt, setPrompt] = React.useState('');
  const [error, setError] = React.useState('');
  const [generated, setGenerated] = React.useState<AiGeneratedChecklistTemplate | null>(null);
  const [includedGroups, setIncludedGroups] = React.useState<Set<number>>(new Set());
  const [applyAvatarAndTags, setApplyAvatarAndTags] = React.useState(false);

  const reset = () => {
    setPhase('prompt');
    setPrompt('');
    setError('');
    setGenerated(null);
    setIncludedGroups(new Set());
    setApplyAvatarAndTags(false);
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setPhase('loading');
    setError('');
    try {
      const allFields = getAllRecordFields();
      const result = await generateChecklistTemplate({
        prompt: prompt.trim(),
        availableFields: allFields.map(f => ({ title: f.title, icon: f.icon, type: f.type, unit: f.unit })),
        ...(mode === 'existing' && existingTemplate
          ? {
            existing: {
              title: existingTemplate.title,
              fieldGroups: existingTemplate.fieldGroups.map(g => ({
                title: g.title,
                fields: g.fields
                  .map(id => allFields.find(f => f.id === id)?.title)
                  .filter((title): title is string => !!title),
              })),
            },
          }
          : {}),
      });
      setGenerated(result);
      setIncludedGroups(new Set(result.fieldGroups.map((_, i) => i)));
      setPhase('review');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate a plan — try again.");
      setPhase('error');
    }
  };

  const toggleGroup = (index: number) => {
    setIncludedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApply = () => {
    if (!generated) return;
    const filtered: AiGeneratedChecklistTemplate = {
      ...generated,
      fieldGroups: generated.fieldGroups.filter((_, i) => includedGroups.has(i)),
    };
    if (filtered.fieldGroups.length === 0) return;

    if (mode === 'new') {
      const { id } = applyAsNewTemplate(filtered);
      onApplied?.({ id });
    } else if (existingTemplate) {
      const template = applyToExistingTemplate(existingTemplate, filtered, { applyAvatarAndTags });
      onApplied?.({ id: existingTemplate.id, template });
    }
    handleDismiss();
  };

  const content = !isPro ? (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography.Title level={4} noMargin>
          {intl.formatMessage({ id: 'ai-checklist-generate.pro-title', defaultMessage: 'AI Generation is a Pro feature' })}
        </Typography.Title>
        <Icon onClick={handleDismiss} width={20} icon="basil:close-outline" className={styles.closeIcon} />
      </div>
      <div className={styles.body}>
        <Icon width={48} icon="solar:magic-stick-3-bold-duotone" className={styles.upsellIcon} />
        <Typography.Text className={styles.upsellText}>
          {intl.formatMessage({
            id: 'ai-checklist-generate.pro-description',
            defaultMessage: 'Upgrade to Pro to generate groups, fields, schedules, and an icon/color from a plain-text description.',
          })}
        </Typography.Text>
      </div>
    </div>
  ) : (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography.Title level={4} noMargin>
          {intl.formatMessage({ id: 'ai-checklist-generate.title', defaultMessage: 'Generate with AI' })}
        </Typography.Title>
        <Icon onClick={handleDismiss} width={20} icon="basil:close-outline" className={styles.closeIcon} />
      </div>

      <div className={styles.body}>
        {(phase === 'prompt' || phase === 'loading' || phase === 'error') && (
          <>
            <Typography.Text className={styles.description}>
              {mode === 'new'
                ? intl.formatMessage({
                  id: 'ai-checklist-generate.new-description',
                  defaultMessage: "Describe what you want to build, and we'll propose groups, fields, a schedule, and an icon.",
                })
                : intl.formatMessage({
                  id: 'ai-checklist-generate.existing-description',
                  defaultMessage: "Describe what to add — we'll propose new groups to add to this task.",
                })}
            </Typography.Text>
            <textarea
              className={styles.promptInput}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={intl.formatMessage({
                id: 'ai-checklist-generate.placeholder',
                defaultMessage: 'e.g. Help me create a schedule for gym mostly build muscle',
              })}
              rows={4}
              disabled={phase === 'loading'}
            />
            {phase === 'error' && <Typography.Text className={styles.errorText}>{error}</Typography.Text>}
          </>
        )}

        {phase === 'review' && generated && (
          <div className={styles.review}>
            <div className={styles.avatarPreview}>
              <div className={styles.avatarIcon} style={{ background: generated.avatar.color }}>
                <Icon width={24} icon={generated.avatar.name} color="#fff" />
              </div>
              <Typography.Text className={styles.avatarTitle}>{generated.title}</Typography.Text>
              {mode === 'existing' && (
                <div className={styles.avatarToggle}>
                  <Toggle checked={applyAvatarAndTags} onChange={setApplyAvatarAndTags} />
                  <Typography.Text className={styles.avatarToggleLabel}>
                    {intl.formatMessage({
                      id: 'ai-checklist-generate.apply-avatar',
                      defaultMessage: 'Also apply this icon, color & tags',
                    })}
                  </Typography.Text>
                </div>
              )}
            </div>

            {generated.fieldGroups.map((group, index) => (
              <div key={index} className={styles.groupCard}>
                <div className={styles.groupHeader}>
                  <Checkbox checked={includedGroups.has(index)} onChange={() => toggleGroup(index)} />
                  <Typography.Text className={styles.groupTitle}>{group.title}</Typography.Text>
                  <Typography.Text className={styles.groupSchedule}>
                    {group.repeat ? formatDayOfWeek(group.repeat.dayOfWeek) : intl.formatMessage({ id: 'ai-checklist-generate.every-day', defaultMessage: 'Every day' })}
                  </Typography.Text>
                </div>
                {group.note && <Typography.Text className={styles.groupNote}>{group.note}</Typography.Text>}
                <div className={styles.fieldsList}>
                  {group.fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className={styles.fieldItem}>
                      <Icon width={16} icon={field.icon} className={styles.fieldIcon} />
                      <Typography.Text className={styles.fieldLabel}>{field.title}</Typography.Text>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {phase === 'review' ? (
          <>
            <Button onClick={() => setPhase('prompt')} type="ghost" className={styles.secondaryButton}>
              {intl.formatMessage({ id: 'ai-checklist-generate.back', defaultMessage: 'Back' })}
            </Button>
            <Button onClick={handleApply} type="primary" disabled={includedGroups.size === 0} className={styles.primaryButton}>
              {mode === 'new'
                ? intl.formatMessage({ id: 'ai-checklist-generate.apply-new', defaultMessage: 'Create Task' })
                : intl.formatMessage({ id: 'ai-checklist-generate.apply-existing', defaultMessage: 'Add to Task' })}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleDismiss} type="ghost" className={styles.secondaryButton}>
              {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              onClick={handleGenerate}
              type="primary"
              disabled={!prompt.trim() || phase === 'loading'}
              className={styles.primaryButton}
            >
              {phase === 'loading'
                ? intl.formatMessage({ id: 'ai-checklist-generate.generating', defaultMessage: 'Generating…' })
                : intl.formatMessage({ id: 'ai-checklist-generate.generate', defaultMessage: 'Generate' })}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return <Modal visible={visible} onDismiss={handleDismiss} content={content} />;
};

const DAY_NAMES: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
};

function formatDayOfWeek(dayOfWeek: string): string {
  if (!dayOfWeek || dayOfWeek === '*') return 'Every day';
  return dayOfWeek.split(',').map(d => DAY_NAMES[d.trim()] ?? d).join(', ');
}

export default AiChecklistGenerate;
