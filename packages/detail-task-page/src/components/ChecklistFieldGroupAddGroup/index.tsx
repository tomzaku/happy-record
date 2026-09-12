import React from 'react';
import cx from 'classnames';
import { Icon } from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import { useIntl } from '@dreamer/translation';
import { FieldGroup } from '@dreamer/global';
import { ChecklistFieldGroupTab } from '../ChecklistFieldGroupHeader';
import styles from './index.module.scss';

/** The caller (ChecklistFieldGroup) owns `checklistTemplateId`/`position` — this component
 * doesn't know which template it's adding to, so it hands back everything else and lets
 * `onAddFieldGroup` fill those in before actually persisting the group (see useFieldGroups.tsx's
 * `addFieldGroup`). */
type NewFieldGroup = Omit<FieldGroup, 'checklistTemplateId' | 'position' | 'updatedAt'>;

interface ChecklistFieldGroupAddGroupProps {
  onAddFieldGroup: (newGroup: NewFieldGroup) => void;
  /** Opens the existing "Add to This Task with AI" flow (AiChecklistGenerate, mode="existing") —
   * same instance ParentTaskHeader's own AI button and each empty collapsed row's own shortcut
   * open; this row only surfaces one more entry point to it, right next to plain manual entry. */
  onOpenAiGenerate?: () => void;
  /** The checklist/template this would attach a new group to hasn't loaded yet — this row
   *  itself is still worth showing as-is, just disabled, until real data says otherwise. */
  disabled?: boolean;
}

/**
 * A plain "Add sub task…" input, not a modal — a sub-task only needs a name to exist. It's
 * created empty (no fields, no note): the resulting card starts collapsed (see
 * useFieldGroupAccordion's own "no note, no fields" rule) with an AI shortcut on its own collapsed
 * row (ChecklistFieldGroup's renderBody) and, once expanded, a plain inline "what do you want to
 * record?" field picker (ChecklistFieldGroupAdd) — neither lives here, this row only creates the
 * group.
 */
const ChecklistFieldGroupAddGroup = ({
  onAddFieldGroup,
  onOpenAiGenerate,
  disabled,
}: ChecklistFieldGroupAddGroupProps) => {
  const intl = useIntl();
  const [title, setTitle] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || disabled) return;
    const newGroup: NewFieldGroup = {
      id: `group-${Date.now()}`,
      title: trimmed,
      fields: [],
      defaultTab: ChecklistFieldGroupTab.Add,
      activeTabs: [
        ChecklistFieldGroupTab.Home,
        ChecklistFieldGroupTab.History,
        ChecklistFieldGroupTab.Metric,
        ChecklistFieldGroupTab.Add,
      ],
      collapseDefault: false,
    };
    onAddFieldGroup(newGroup);
    setTitle('');
    // Adding several sub-tasks in a row is the common case — no reason to make the user re-click
    // into the field each time.
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.inputRow}>
        <Input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          placeholder={intl.formatMessage({
            id: 'checklist-field-group-add-group.placeholder',
            defaultMessage: 'Add sub task…',
          })}
          classes={{
            wrapper: styles.inputWrapper,
            input: onOpenAiGenerate ? cx(styles.input, styles.inputWithAiButton) : styles.input,
            placeholder: styles.placeholder,
          }}
          disabled={disabled}
          border="dash"
          renderLeftInput={() => (
            <Icon width={22} height={22} icon="solar:add-circle-bold" className={styles.addIcon} />
          )}
          renderRightInput={() =>
            onOpenAiGenerate ? (
              <button
                type="button"
                className={styles.aiButton}
                onClick={onOpenAiGenerate}
                disabled={disabled}
              >
                <Icon width={16} icon="solar:magic-stick-3-bold-duotone" />
                {intl.formatMessage({
                  id: 'checklist-field-group-add-group.generate-with-ai',
                  defaultMessage: 'Generate subtask with AI',
                })}
              </button>
            ) : (
              <></>
            )
          }
        />
      </form>
    </div>
  );
};

export default ChecklistFieldGroupAddGroup;
