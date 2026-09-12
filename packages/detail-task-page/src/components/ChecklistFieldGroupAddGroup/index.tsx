import React from 'react';
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
   * this component only surfaces the entry point, same as ParentTaskHeader's own AI button; the
   * modal itself is owned and rendered once at the page level. */
  onOpenAiGenerate?: () => void;
  /** The checklist/template this would attach a new group to hasn't loaded yet — this row
   *  itself is still worth showing as-is, just disabled, until real data says otherwise. */
  disabled?: boolean;
}

/**
 * A plain "Add sub task…" input, not a modal — a sub-task only needs a name to exist (see
 * ChecklistFieldGroup's own accordion, one level up: fields, schedule, note, everything else is
 * configured on the card itself once it's there via its own settings menu). This used to open a
 * whole Create New Group dialog (group name + a required field selection + an "Add Field" detour)
 * before a group could even be created at all — that's what AiChecklistGenerate's "Add to This
 * Task with AI" prompt (surfaced right below, once something's actually been typed) is for now:
 * describing what the sub-task should track and letting AI propose the fields/schedule, instead
 * of making every sub-task start with a manual field picklist.
 */
const ChecklistFieldGroupAddGroup = ({
  onAddFieldGroup,
  onOpenAiGenerate,
  disabled,
}: ChecklistFieldGroupAddGroupProps) => {
  const intl = useIntl();
  const [title, setTitle] = React.useState('');
  // Shown right after a sub-task is created, until the user starts typing the next one — a nudge
  // toward the existing AI flow for fleshing this one out, not a permanent fixture of the row.
  const [justAdded, setJustAdded] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || disabled) return;
    const newGroup: NewFieldGroup = {
      id: `group-${Date.now()}`,
      title: trimmed,
      // No fields yet — Select Fields now lives on the card's own settings menu once it exists
      // (ChecklistFieldGroupMenu), or the AI prompt below proposes some right away.
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
    setJustAdded(true);
    // Back to the input, not the AI hint that just appeared below it — adding several sub-tasks
    // in a row (the common case) shouldn't need a re-click into the field each time.
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setTitle(e.target.value);
            setJustAdded(false);
          }}
          placeholder={intl.formatMessage({
            id: 'checklist-field-group-add-group.placeholder',
            defaultMessage: 'Add sub task…',
          })}
          classes={{ wrapper: styles.inputWrapper, input: styles.input, placeholder: styles.placeholder }}
          disabled={disabled}
          border="dash"
          renderRightInput={() => <></>}
          renderLeftInput={() => (
            <Icon width={22} height={22} icon="solar:add-circle-bold" className={styles.addIcon} />
          )}
        />
      </form>
      {justAdded && onOpenAiGenerate && (
        <button type="button" className={styles.aiHint} onClick={onOpenAiGenerate}>
          <Icon width={16} icon="solar:magic-stick-3-bold-duotone" />
          {intl.formatMessage({
            id: 'checklist-field-group-add-group.add-detail-with-ai',
            defaultMessage: 'Add more detail with AI',
          })}
          <Icon width={14} icon="solar:alt-arrow-right-linear" className={styles.aiHintArrow} />
        </button>
      )}
    </div>
  );
};

export default ChecklistFieldGroupAddGroup;
