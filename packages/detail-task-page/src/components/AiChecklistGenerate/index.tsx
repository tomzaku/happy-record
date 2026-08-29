import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Toggle from '@moon-ui/toggle';
import { Modal, BottomModal } from '@moon-ui/modal';
import { useIntl } from '@dreamer/translation';
import {
  ApiError,
  ChecklistTemplate,
  useIsMobile,
  useIsPro,
  useRecordField,
  useApplyAiChecklistTemplate,
  generateChecklistTemplate,
  type AiGeneratedChecklistTemplate,
  type AiGeneratedNoteBlock,
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
  const isMobile = useIsMobile();
  const { isPro } = useIsPro();
  const { getAllRecordFields } = useRecordField();
  const { applyAsNewTemplate, applyToExistingTemplate } = useApplyAiChecklistTemplate();

  const [phase, setPhase] = React.useState<Phase>('prompt');
  const [prompt, setPrompt] = React.useState('');
  const [error, setError] = React.useState('');
  const [generated, setGenerated] = React.useState<AiGeneratedChecklistTemplate | null>(null);
  const [includedGroups, setIncludedGroups] = React.useState<Set<number>>(new Set());
  const [applyAvatarAndTags, setApplyAvatarAndTags] = React.useState(false);

  // Feedback loop on an already-generated proposal ("make Push Day easier", "move Pull Day to
  // Wednesday") — a separate request that sends the current `generated` back as `refine.previous`
  // alongside the feedback text (see ai-checklist-template's own prompt for what it does with
  // that). Its own loading/error state, deliberately not reusing `phase`/`error`: those drive the
  // prompt-vs-review screen switch, and a failed revision should leave the current proposal on
  // screen rather than discarding it back to the prompt screen — see handleRevise.
  const [feedback, setFeedback] = React.useState('');
  const [isRevising, setIsRevising] = React.useState(false);
  const [reviseError, setReviseError] = React.useState('');

  const reset = () => {
    setPhase('prompt');
    setPrompt('');
    setError('');
    setGenerated(null);
    setIncludedGroups(new Set());
    setApplyAvatarAndTags(false);
    setFeedback('');
    setIsRevising(false);
    setReviseError('');
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  // Shared by a fresh generation and a feedback-driven revision — only what varies (whether this
  // is a follow-up on a previous proposal) is passed in.
  const buildParams = (refine?: { previous: AiGeneratedChecklistTemplate; feedback: string }) => {
    const allFields = getAllRecordFields();
    return {
      prompt: prompt.trim(),
      availableFields: allFields.map(f => ({ title: f.title, icon: f.icon, type: f.type, unit: f.unit })),
      ...(mode === 'existing' && existingTemplate
        ? {
          existing: {
            title: existingTemplate.title,
            fieldGroups: existingTemplate.fieldGroups.map(g => ({
              title: g.title,
              fields: g.fields
                .map(({ fieldId }) => allFields.find(f => f.id === fieldId)?.title)
                .filter((title): title is string => !!title),
            })),
          },
        }
        : {}),
      ...(refine ? { refine } : {}),
    };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setPhase('loading');
    setError('');
    try {
      const result = await generateChecklistTemplate(buildParams());
      setGenerated(result);
      setIncludedGroups(new Set(result.fieldGroups.map((_, i) => i)));
      setFeedback('');
      setPhase('review');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate a plan — try again.");
      setPhase('error');
    }
  };

  const handleRevise = async () => {
    if (!feedback.trim() || !generated) return;
    setIsRevising(true);
    setReviseError('');
    try {
      const result = await generateChecklistTemplate(
        buildParams({ previous: generated, feedback: feedback.trim() }),
      );
      setGenerated(result);
      setIncludedGroups(new Set(result.fieldGroups.map((_, i) => i)));
      setFeedback('');
    } catch (err) {
      setReviseError(
        err instanceof ApiError ? err.message : "Couldn't apply that feedback — try again.",
      );
    } finally {
      setIsRevising(false);
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

  const handleApply = async () => {
    if (!generated) return;
    const filtered: AiGeneratedChecklistTemplate = {
      ...generated,
      fieldGroups: generated.fieldGroups.filter((_, i) => includedGroups.has(i)),
    };
    if (filtered.fieldGroups.length === 0) return;

    // Both awaited now — applyAsNewTemplate/applyToExistingTemplate are async (see
    // useApplyAiChecklistTemplate.ts's own comment: a proposed group's note has to actually be
    // written before the group referencing its id is).
    if (mode === 'new') {
      const { id } = await applyAsNewTemplate(filtered);
      onApplied?.({ id });
    } else if (existingTemplate) {
      const template = await applyToExistingTemplate(existingTemplate, filtered, { applyAvatarAndTags });
      onApplied?.({ id: existingTemplate.id, template });
    }
    handleDismiss();
  };

  const content = !isPro ? (
    <>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.badge}>
            <Icon width={18} icon="solar:magic-stick-3-bold-duotone" color="#fff" />
          </div>
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ai-checklist-generate.pro-title', defaultMessage: 'AI Generation is a Pro feature' })}
          </Typography.Title>
        </div>
        <Icon onClick={handleDismiss} width={20} icon="basil:close-outline" className={styles.closeIcon} />
      </div>
      <div className={styles.body}>
        <div className={styles.upsellBadge}>
          <Icon width={32} icon="solar:magic-stick-3-bold-duotone" color="#fff" />
        </div>
        <Typography.Text className={styles.upsellText}>
          {intl.formatMessage({
            id: 'ai-checklist-generate.pro-description',
            defaultMessage: 'Upgrade to Pro to generate groups, fields, schedules, and an icon/color from a plain-text description.',
          })}
        </Typography.Text>
      </div>
    </>
  ) : (
    <>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.badge}>
            <Icon width={18} icon="solar:magic-stick-3-bold-duotone" color="#fff" />
          </div>
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ai-checklist-generate.title', defaultMessage: 'Generate with AI' })}
          </Typography.Title>
        </div>
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
            {phase === 'loading' && (
              <div className={styles.loadingRow}>
                <Icon width={18} icon="svg-spinners:180-ring" color="#a855f7" />
                <Typography.Text className={styles.loadingText}>
                  {intl.formatMessage({ id: 'ai-checklist-generate.generating-body', defaultMessage: 'Thinking through groups, fields, and a schedule…' })}
                </Typography.Text>
              </div>
            )}
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
                {group.note.length > 0 && (
                  <Typography.Text className={styles.groupNote}>
                    {summarizeNoteBlocks(group.note)}
                  </Typography.Text>
                )}
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

            <div className={styles.reviseSection}>
              <Typography.Text className={styles.description}>
                {intl.formatMessage({
                  id: 'ai-checklist-generate.revise-description',
                  defaultMessage: "Not quite right? Say what to change and we'll update the proposal above.",
                })}
              </Typography.Text>
              <textarea
                className={styles.promptInput}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder={intl.formatMessage({
                  id: 'ai-checklist-generate.revise-placeholder',
                  defaultMessage: 'e.g. Make Push Day easier, move Pull Day to Wednesday',
                })}
                rows={2}
                disabled={isRevising}
              />
              {reviseError && <Typography.Text className={styles.errorText}>{reviseError}</Typography.Text>}
              <Button
                onClick={handleRevise}
                type="ghost"
                disabled={!feedback.trim() || isRevising}
                className={styles.reviseButton}
              >
                {isRevising
                  ? intl.formatMessage({ id: 'ai-checklist-generate.revising', defaultMessage: 'Updating…' })
                  : intl.formatMessage({ id: 'ai-checklist-generate.revise', defaultMessage: 'Update with feedback' })}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {phase === 'review' ? (
          <>
            <Button
              onClick={() => setPhase('prompt')}
              type="ghost"
              disabled={isRevising}
              className={styles.secondaryButton}
            >
              {intl.formatMessage({ id: 'ai-checklist-generate.back', defaultMessage: 'Back' })}
            </Button>
            <Button
              onClick={handleApply}
              disabled={includedGroups.size === 0 || isRevising}
              className={styles.gradientButton}
            >
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
              disabled={!prompt.trim() || phase === 'loading'}
              className={styles.gradientButton}
            >
              {phase !== 'loading' && (
                <Icon width={16} icon="solar:magic-stick-3-bold-duotone" color="#fff" />
              )}
              {phase === 'loading'
                ? intl.formatMessage({ id: 'ai-checklist-generate.generating', defaultMessage: 'Generating…' })
                : intl.formatMessage({ id: 'ai-checklist-generate.generate', defaultMessage: 'Generate' })}
            </Button>
          </>
        )}
      </div>
    </>
  );

  // The centered floating card (@moon-ui/modal's Modal) works fine on desktop, where there's
  // room around it — on a phone screen it left cramped side margins and sat awkwardly
  // mid-viewport instead of behaving like every other mobile sheet in this app. BottomModal
  // (already how ChecklistGenericInfo's own Icon/Schedule/Tags edits behave on mobile) gives
  // it the native full-width, slide-up-from-bottom, swipe-to-dismiss treatment instead.
  return isMobile ? (
    <BottomModal
      visible={visible}
      onDismiss={handleDismiss}
      content={<div className={styles.mobileSheet}>{content}</div>}
    />
  ) : (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      content={content}
      className={styles.modalShell}
    />
  );
};

const DAY_NAMES: Record<string, string> = {
  '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
};

function formatDayOfWeek(dayOfWeek: string): string {
  if (!dayOfWeek || dayOfWeek === '*') return 'Every day';
  return dayOfWeek.split(',').map(d => DAY_NAMES[d.trim()] ?? d).join(', ');
}

/**
 * A one-line preview of the group's note for this review card — the actual multi-block Editor.js
 * document (headings, quotes, an embed) only gets built on Accept, in
 * useApplyAiChecklistTemplate.ts's buildNoteFromBlocks. This just needs to give a sense of what's
 * in there without rendering a real editor inside a small review card.
 */
function summarizeNoteBlocks(blocks: AiGeneratedNoteBlock[]): string {
  return blocks
    .map(block => (block.type === 'video' ? '🎥 includes a video' : block.text))
    .join(' · ');
}

export default AiChecklistGenerate;
