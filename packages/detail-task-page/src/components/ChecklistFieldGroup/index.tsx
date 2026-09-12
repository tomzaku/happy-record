import React from 'react';
import {
  Checklist,
  ChecklistTemplate,
  FieldGroup,
  getActiveFieldGroups,
  getNextScheduledDayLabel,
  isFieldGroupActiveOnDay,
  useChecklist,
  useFieldGroups,
  useIsMobile,
} from '@dreamer/global';
import { getEffectiveFieldDisplay, RecordField } from '@dreamer/global/src/store/record-field';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import ChecklistFieldGroupHeader from '../ChecklistFieldGroupHeader';
import { motion } from 'motion/react';
import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import ChecklistFieldGroupAdd from '../ChecklistFieldGroupAdd';
import ChecklistFieldGroupHistory from '../ChecklistFieldGroupHistory';
import ChecklistFieldGroupView from '../ChecklistFieldGroupView';
import ChecklistFieldMetric from '../ChecklistFieldMetric';
import CollapsibleSection from './CollapsibleSection';
import ChecklistFieldGroupMenu, {
  ChecklistFieldGroupMenuHandle,
} from '../ChecklistFieldGroupMenu';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import ChecklistFieldGroupAddGroup from '../ChecklistFieldGroupAddGroup';
import { Icon } from '@moon-ui/icon/Icon';
import cx from 'classnames';
import { useFieldGroupAccordion } from './useFieldGroupAccordion';

type Props = {
  checklist: Checklist;
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
  currentDay: string;
  /** A non-owner viewing someone else's template (see index.mobile.tsx/index.desktop.tsx's own
   * `isOwner`) — field groups are a real resource with their own owner-only RLS now (see
   * useFieldGroups.tsx), so this is what keeps a non-owner's client from even attempting a write
   * that would just fail server-side anyway. Defaults to editable, same as before this existed. */
  readOnly?: boolean;
  onFieldAdded?: (newField: RecordField) => void;
  /** Bubbled down into each group's own History section (see
   * ChecklistFieldGroupHistory's Calendar mode) — same page-level
   * currentDay/checklistId nav ChecklistTemplateCalendar's Calendar mode
   * already uses. */
  onDaySelect?: (date: Date) => void;
  /** Opens the page-level "Add to This Task with AI" modal (AiChecklistGenerate, mode="existing")
   * — same instance ParentTaskHeader's own AI button opens, bubbled down to
   * ChecklistFieldGroupAddGroup's own post-create nudge (see that component's own doc). */
  onOpenAiGenerate?: () => void;
};

const ChecklistFieldGroup = ({
  checklist,
  checklistTemplate,
  fields,
  currentDay,
  readOnly = false,
  onFieldAdded,
  onDaySelect,
  onOpenAiGenerate,
}: Props) => {
  const { updateChecklist } = useChecklist();
  const { addFieldGroup, updateFieldGroup } = useFieldGroups();
  const intl = useIntl();
  // Desktop has real width to spare — Submit and Metrics sit side by side there instead of
  // Metrics being one more collapsible section stacked under Submit, the shape mobile keeps
  // (no room for two columns on a phone-width card).
  const isMobile = useIsMobile();
  // Keyed by fieldGroup id — the Submit form's own "Select Fields" button (see
  // ChecklistFieldGroupAdd's onOpenFieldSettings) reaches into this same group's settings menu
  // rather than duplicating the Select Fields dialog, so it stays the one place that dialog
  // actually lives.
  const menuRefs = React.useRef<Record<string, ChecklistFieldGroupMenuHandle | null>>({});
  // Groups scheduled today float to the top; a stable sort keeps everything else in its existing
  // relative order. Shared between the accordion's own "which one is current" pick and the render
  // order below, so the two never disagree about which group is first.
  const sortedGroups = React.useMemo(
    () =>
      [...getActiveFieldGroups(checklistTemplate.fieldGroups)].sort((a, b) => {
        const aActive = isFieldGroupActiveOnDay(a.repeat, new Date(currentDay));
        const bActive = isFieldGroupActiveOnDay(b.repeat, new Date(currentDay));
        return aActive === bActive ? 0 : aActive ? -1 : 1;
      }),
    [checklistTemplate.fieldGroups, currentDay],
  );
  // Clipped only while the height:0<->auto collapse animation below is actually running (see
  // .cardContainer's own history — it used to carry a permanent `overflow: hidden` to fix that
  // animation's visual glitch, but that also clipped anything a settled, expanded group's content
  // draws outside its own bounds, e.g. the note editor's "+" block-type popover, which isn't
  // portaled and relies on being visible past this card). Once the animation settles, overflow
  // goes back to visible so content like that popover isn't clipped during normal use.
  const [collapseAnimating, setCollapseAnimating] = React.useState<
    Record<string, boolean>
  >({});

  // Keyed by fieldGroup id so each group's `fieldDetails` array keeps the
  // same reference across renders where `checklistTemplate.fieldGroups`/
  // `fields` themselves haven't changed — computing it inline inside
  // `renderBody` below (a fresh `.map().filter()` every render, regardless
  // of whether anything real changed) fed an unstable array straight into
  // ChecklistFieldGroupAdd's own `fields` prop, which is a dependency of an
  // effect there (see that component's own comment) — so *any* unrelated
  // re-render of this component re-ran that effect too, on every field
  // group, every time.
  const fieldDetailsByGroup = React.useMemo(() => {
    const map: Record<string, RecordField[]> = {};
    for (const fieldGroup of checklistTemplate.fieldGroups) {
      map[fieldGroup.id] = fieldGroup.fields
        .map(({ fieldId, overrides }) => {
          const field = fields.find(f => f.id === fieldId);
          // Merged here, once, so every tab that reads these fields (History, Metric, and
          // Add's own submit-input prefill) sees this group's own title/icon/defaultValue/
          // placeholder without each one re-implementing the override merge itself.
          return field ? getEffectiveFieldDisplay(field, overrides) : undefined;
        })
        .filter((field): field is RecordField => field !== undefined);
    }
    return map;
  }, [checklistTemplate.fieldGroups, fields]);

  // Which sub-task card is expanded by default (the current/next incomplete one) and each one's
  // own done-today state (drives the collapsed row's own indicator dot below) — see that hook's
  // own comment for why this is a same-day record-presence check, not a real completion flag.
  const { isCollapsed, toggleCollapse, hasSubmittedToday } = useFieldGroupAccordion({
    checklistTemplateId: checklistTemplate.id,
    currentDay,
    sortedGroups,
    fieldDetailsByGroup,
  });

  // Plain title text only now — the schedule status used to be baked into this same return
  // value (a two-line flex-column sitting inside the header's Typography.Title), which put the
  // settings cog (a sibling of the whole title block) dead center against *both* lines instead
  // of next to the title text itself. ChecklistFieldGroupHeader's own `renderStatus` slot is
  // what that status moved into — see renderScheduleStatus below.
  const renderTitle = (fieldGroup: FieldGroup) => fieldGroup.title;

  // Always shows something now, not only when the group isn't scheduled today — a group that
  // *is* active gets its own "Scheduled today" badge instead of the header silently having a
  // status row some days and not others.
  const renderScheduleStatus = (fieldGroup: FieldGroup) => {
    if (isFieldGroupActiveOnDay(fieldGroup.repeat, new Date(currentDay))) {
      return (
        <Typography.Text className={styles.scheduledBadge}>
          {intl.formatMessage({
            id: 'checklist-field-group.scheduled-today',
            defaultMessage: 'Scheduled today',
          })}
        </Typography.Text>
      );
    }
    // See scheduleUtils.ts's isFieldGroupActiveOnDay.
    const nextDayLabel = getNextScheduledDayLabel(fieldGroup.repeat, new Date(currentDay));
    return (
      <Typography.Text className={styles.notScheduledBadge}>
        {nextDayLabel
          ? intl.formatMessage(
              {
                id: 'checklist-field-group.not-scheduled-today-next',
                defaultMessage: 'Next {{nextDayLabel}}',
              },
              { nextDayLabel },
            )
          : intl.formatMessage({
              id: 'checklist-field-group.not-scheduled-today',
              defaultMessage: 'Not scheduled today',
            })}
      </Typography.Text>
    );
  };
  // Shared by every place that changes one group in place (the settings menu's
  // field/tab/name/collapse changes) — one row now (see useFieldGroups.tsx), no more
  // index-based splicing into a shared array. A no-op for a non-owner (see `readOnly`) rather
  // than firing a write RLS would reject anyway.
  const saveFieldGroupChange = (updatedGroup: FieldGroup) => {
    if (readOnly) return;
    updateFieldGroup(updatedGroup);
  };

  // Note and Submit are the two things worth seeing at a glance without a tap — paired side by
  // side on desktop (6:4, Note wider since it's often the longer read); History and Metrics are
  // both read occasionally rather than every day, so both are collapsible tabs, closed by default
  // (CollapsibleSection's own default), on both platforms. Mobile has no room for a two-column
  // row, so Note folds into the same tab stack there instead of sitting beside Submit.
  const renderGroupContent = ({
    fieldGroup,
    fieldDetails,
  }: {
    fieldGroup: FieldGroup;
    fieldDetails: RecordField[];
  }) => (
    <>
      <div className={styles.noteSubmitRow}>
        {!isMobile && (
          <div className={styles.noteColumn}>
            {/* Absolutely positioned, not a normal-flow child — a long note's own content must
                scroll within the column, not grow it: this row's height is meant to track
                Submit's (see .noteColumn's own comment), so Note's real content height can't be
                allowed to factor into that at all, only its 500px floor. */}
            <div className={styles.noteColumnScroll}>
              <Typography.Text className={styles.noteColumnLabel}>
                {intl.formatMessage({ id: 'checklist-field-group.note-title', defaultMessage: 'Note' })}
              </Typography.Text>
              <ChecklistFieldGroupView fieldGroup={fieldGroup} isOwner={!readOnly} editInModal />
            </div>
          </div>
        )}
        <div className={styles.submitColumn}>
          <ChecklistFieldGroupAdd
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
            fieldGroup={fieldGroup}
            checklist={checklist}
            currentDay={currentDay}
            onOpenFieldSettings={() => menuRefs.current[fieldGroup.id]?.openFieldsDialog()}
            availableFields={fields}
            onAddExistingField={fieldId =>
              saveFieldGroupChange({ ...fieldGroup, fields: [...fieldGroup.fields, { fieldId }] })
            }
            onSubmit={() =>
              updateChecklist({
                id: checklist.id,
                completedAt: new Date().toISOString(),
              })
            }
          />
        </div>
      </div>
      <CollapsibleSection
        icon="solar:clock-square-broken"
        label={intl.formatMessage({ id: 'checklist-field-group.history-title', defaultMessage: 'History' })}
      >
        <ChecklistFieldGroupHistory
          fields={fieldDetails}
          checklistTemplate={checklistTemplate}
          fieldGroup={fieldGroup}
          onDaySelect={onDaySelect}
        />
      </CollapsibleSection>
      <CollapsibleSection
        icon="solar:chart-square-linear"
        label={intl.formatMessage({ id: 'checklist-field-group.metrics-title', defaultMessage: 'Metrics' })}
      >
        <ChecklistFieldMetric fields={fieldDetails} checklistTemplateId={checklistTemplate.id} />
      </CollapsibleSection>
      {isMobile && (
        <CollapsibleSection
          icon="solar:document-text-linear"
          label={intl.formatMessage({ id: 'checklist-field-group.note-title', defaultMessage: 'Note' })}
          summary={
            fieldGroup.noteId
              ? undefined
              : intl.formatMessage({ id: 'checklist-field-group.no-note-yet', defaultMessage: 'No note yet' })
          }
        >
          <ChecklistFieldGroupView fieldGroup={fieldGroup} isOwner={!readOnly} />
        </CollapsibleSection>
      )}
    </>
  );
  const renderBody = () => {
    // Each group is its own row now (see useFieldGroups.tsx) — no more index bookkeeping to
    // keep an update aimed at the right array position, unlike the old jsonb-array splice this
    // replaced.
    return sortedGroups.map(fieldGroup => {
      const fieldDetails = fieldDetailsByGroup[fieldGroup.id] ?? [];
      const collapsed = isCollapsed(fieldGroup.id);
      const isActiveToday = isFieldGroupActiveOnDay(fieldGroup.repeat, new Date(currentDay));
      const done = hasSubmittedToday(fieldGroup);

      return (
        <Card
          key={fieldGroup.id}
          className={cx(styles.cardContainer, !isActiveToday && styles.cardNotScheduled)}
        >
          <ChecklistFieldGroupHeader
            renderIndicator={() => (
              <span
                className={cx(styles.doneIndicator, done && styles.doneIndicatorDone)}
                title={
                  done
                    ? intl.formatMessage({ id: 'checklist-field-group.done-today', defaultMessage: 'Done today' })
                    : intl.formatMessage({ id: 'checklist-field-group.not-done-today', defaultMessage: 'Not done yet' })
                }
              >
                {done && <Icon width={12} icon="solar:check-read-linear" color="#fff" />}
              </span>
            )}
            renderTitle={() => renderTitle(fieldGroup)}
            renderStatus={() => renderScheduleStatus(fieldGroup)}
            // The settings cog only matters once you're actually looking at this sub-task's own
            // content — hidden on a collapsed row so the compact summary line stays uncluttered,
            // same as the mockup's own collapsed rows never showing one.
            renderMenu={
              collapsed
                ? undefined
                : () => (
                    <ChecklistFieldGroupMenu
                      ref={handle => {
                        menuRefs.current[fieldGroup.id] = handle;
                      }}
                      fieldGroup={fieldGroup}
                      onUpdateFieldGroup={saveFieldGroupChange}
                      availableFields={fields.map(f => f.id)}
                      allRecordFields={fields}
                      onFieldAdded={onFieldAdded}
                    />
                  )
            }
            isCollapsed={collapsed}
            onToggleCollapse={() => toggleCollapse(fieldGroup.id)}
          />
          <motion.div
            initial={false}
            animate={{
              height: collapsed ? 0 : 'auto',
              opacity: collapsed ? 0 : 1,
            }}
            transition={{
              height: {
                type: 'spring',
                stiffness: 300,
                damping: 30,
              },
              opacity: {
                duration: 0.2,
              },
            }}
            onAnimationStart={() =>
              setCollapseAnimating(prev => ({ ...prev, [fieldGroup.id]: true }))
            }
            onAnimationComplete={() =>
              setCollapseAnimating(prev => ({ ...prev, [fieldGroup.id]: false }))
            }
            style={{
              overflow: collapsed || collapseAnimating[fieldGroup.id] ? 'hidden' : 'visible',
            }}
          >
            <Hr classes={{ hr: styles.hr, container: styles.hrContainer }} />
            {renderGroupContent({ fieldGroup, fieldDetails })}
          </motion.div>
        </Card>
      );
    });
  }
  const handleAddFieldGroup = (newGroup: Omit<FieldGroup, 'checklistTemplateId' | 'position' | 'updatedAt'>) => {
    if (readOnly) return;
    // New groups go last — `position` on the existing ones is already gap-free from however they
    // were created, so the current count is the next free slot.
    addFieldGroup({
      ...newGroup,
      checklistTemplateId: checklistTemplate.id,
      position: checklistTemplate.fieldGroups.length,
    });
    // No collapse-state bookkeeping needed here anymore — useFieldGroupAccordion derives a new
    // group's own expanded/collapsed state the same way it does for every other group, live.
  };

  return (
    <>
      <Typography.Text className={styles.subTasksLabel}>
        {intl.formatMessage({ id: 'checklist-field-group.sub-tasks-title', defaultMessage: 'Sub Tasks' })}
      </Typography.Text>
      {renderBody()}
      <ChecklistFieldGroupAddGroup
        onAddFieldGroup={handleAddFieldGroup}
        onOpenAiGenerate={onOpenAiGenerate}
        disabled={readOnly}
      />
    </>
  )
};
export default ChecklistFieldGroup;
