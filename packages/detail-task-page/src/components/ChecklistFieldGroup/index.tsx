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
} from '@dreamer/global';
import { getEffectiveFieldDisplay, RecordField } from '@dreamer/global/src/store/record-field';
import Card from '@moon-ui/card';
import ChecklistFieldGroupHeader, {
  ChecklistFieldGroupTab,
} from '../ChecklistFieldGroupHeader';
import { AnimatePresence, motion } from 'motion/react';
import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import ChecklistFieldGroupAdd from '../ChecklistFieldGroupAdd';
import ChecklistFieldGroupHistory from '../ChecklistFieldGroupHistory';
import ChecklistFieldGroupView from '../ChecklistFieldGroupView';
import ChecklistFieldMetric from '../ChecklistFieldMetric';
import ChecklistFieldGroupMenu, {
  ChecklistFieldGroupMenuHandle,
} from '../ChecklistFieldGroupMenu';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import ChecklistFieldGroupAddGroup from '../ChecklistFieldGroupAddGroup';

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
  /** Bubbled down into each group's own History tab (see
   * ChecklistFieldGroupHistory's Calendar mode) — same page-level
   * currentDay/checklistId nav ChecklistTemplateCalendar's Calendar mode
   * already uses. */
  onDaySelect?: (date: Date) => void;
};

const ChecklistFieldGroup = ({
  checklist,
  checklistTemplate,
  fields,
  currentDay,
  readOnly = false,
  onFieldAdded,
  onDaySelect,
}: Props) => {
  const { updateChecklist } = useChecklist();
  const { addFieldGroup, updateFieldGroup } = useFieldGroups();
  const intl = useIntl();
  // Keyed by fieldGroup id — the Submit tab's own "Select Fields" button (see
  // ChecklistFieldGroupAdd's onOpenFieldSettings) reaches into this same group's settings menu
  // rather than duplicating the Select Fields dialog, so it stays the one place that dialog
  // actually lives.
  const menuRefs = React.useRef<Record<string, ChecklistFieldGroupMenuHandle | null>>({});
  const [activeTab, setActiveTab] = React.useState<
    Record<string, ChecklistFieldGroupTab>
  >(
    getActiveFieldGroups(checklistTemplate.fieldGroups).reduce((acc, fieldGroup) => {
      return {
        ...acc,
        [fieldGroup.id]: fieldGroup.defaultTab ?? ChecklistFieldGroupTab.Home,
      };
    }, {}),
  );
  const [collapsedGroups, setCollapsedGroups] = React.useState<
    Record<string, boolean>
  >(
    getActiveFieldGroups(checklistTemplate.fieldGroups).reduce((acc, fieldGroup) => {
      return {
        ...acc,
        [fieldGroup.id]: fieldGroup.collapseDefault ?? false,
      };
    }, {}),
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

  const toggleCollapse = (fieldGroupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [fieldGroupId]: !prev[fieldGroupId],
    }));
  };

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
        <span className={styles.scheduledBadge}>
          {intl.formatMessage({
            id: 'checklist-field-group.scheduled-today',
            defaultMessage: 'Scheduled today',
          })}
        </span>
      );
    }
    // See scheduleUtils.ts's isFieldGroupActiveOnDay.
    const nextDayLabel = getNextScheduledDayLabel(fieldGroup.repeat, new Date(currentDay));
    return (
      <span className={styles.notScheduledBadge}>
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
      </span>
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

  const renderTab = ({
    fieldGroup,
    fieldDetails,
  }: {
    fieldGroup: FieldGroup;
    fieldDetails: RecordField[];
  }) => {
    let tabContent;

    switch (activeTab[fieldGroup.id]) {
      case ChecklistFieldGroupTab.Home: {
        tabContent = (
          <ChecklistFieldGroupView
            fieldGroup={fieldGroup}
            isOwner={!readOnly}
          />
        );
        break;
      }
      case ChecklistFieldGroupTab.History: {
        tabContent = (
          <ChecklistFieldGroupHistory
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
            fieldGroup={fieldGroup}
            onDaySelect={onDaySelect}
          />
        );
        break;
      }
      case ChecklistFieldGroupTab.Metric: {
        tabContent = (
          <ChecklistFieldMetric
            fields={fieldDetails}
            checklistTemplateId={checklistTemplate.id}
          />
        );
        break;
      }
      case ChecklistFieldGroupTab.Add: {
        tabContent = (
          <ChecklistFieldGroupAdd
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
            fieldGroup={fieldGroup}
            checklist={checklist}
            currentDay={currentDay}
            onOpenFieldSettings={() => menuRefs.current[fieldGroup.id]?.openFieldsDialog()}
            onSubmit={() => {
              // setActiveTab({
              //   ...activeTab,
              //   [fieldGroup.id]: ChecklistFieldGroupTab.Home,
              // });
              updateChecklist({
                id: checklist.id,
                completedAt: new Date().toISOString(),
              });
            }}
          />
        );
        break;
      }
      default: {
        tabContent = (
          <ChecklistFieldGroupView
            fieldGroup={fieldGroup}
            isOwner={!readOnly}
          />
        );
        break;
      }
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab[fieldGroup.id]}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
        >
          {tabContent}
        </motion.div>
      </AnimatePresence>
    );
  };
  const renderBody = () => {
    // Each group is its own row now (see useFieldGroups.tsx) — no more index bookkeeping to
    // keep an update aimed at the right array position, unlike the old jsonb-array splice this
    // replaced.
    return getActiveFieldGroups(checklistTemplate.fieldGroups)
      // Groups scheduled today float to the top; a stable sort keeps everything else in its
      // existing relative order.
      .sort((a, b) => {
        const aActive = isFieldGroupActiveOnDay(a.repeat, new Date(currentDay));
        const bActive = isFieldGroupActiveOnDay(b.repeat, new Date(currentDay));
        return aActive === bActive ? 0 : aActive ? -1 : 1;
      })
      .map(fieldGroup => {
        const fieldDetails = fieldDetailsByGroup[fieldGroup.id] ?? [];
        const isCollapsed = collapsedGroups[fieldGroup.id] || false;
        const isActiveToday = isFieldGroupActiveOnDay(fieldGroup.repeat, new Date(currentDay));

        return (
          <Card
            key={fieldGroup.id}
            className={[styles.cardContainer, !isActiveToday && styles.cardNotScheduled]
              .filter(Boolean)
              .join(' ')}
          >
            <ChecklistFieldGroupHeader
              activeTab={activeTab[fieldGroup.id]}
              activeTabs={
                fieldGroup.activeTabs ?? [
                  ChecklistFieldGroupTab.Home,
                  ChecklistFieldGroupTab.Metric,
                  ChecklistFieldGroupTab.Add,
                ]
              }
              onClickHome={() =>
                setActiveTab({
                  ...activeTab,
                  [fieldGroup.id]: ChecklistFieldGroupTab.Home,
                })
              }
              onClickHistory={() =>
                setActiveTab({
                  ...activeTab,
                  [fieldGroup.id]: ChecklistFieldGroupTab.History,
                })
              }
              onClickAdd={() =>
                setActiveTab({
                  ...activeTab,
                  [fieldGroup.id]: ChecklistFieldGroupTab.Add,
                })
              }
              onClickMetric={() =>
                setActiveTab({
                  ...activeTab,
                  [fieldGroup.id]: ChecklistFieldGroupTab.Metric,
                })
              }
              renderTitle={() => renderTitle(fieldGroup)}
              renderStatus={() => renderScheduleStatus(fieldGroup)}
              renderMenu={() => (
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
              )}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => toggleCollapse(fieldGroup.id)}
            />
            <motion.div
              initial={false}
              animate={{
                height: isCollapsed ? 0 : 'auto',
                opacity: isCollapsed ? 0 : 1,
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
                overflow: isCollapsed || collapseAnimating[fieldGroup.id] ? 'hidden' : 'visible',
              }}
            >
              <Hr classes={{ hr: styles.hr, container: styles.hrContainer }} />
              {renderTab({ fieldGroup, fieldDetails })}
            </motion.div>
          </Card>
        );
      });
  }
  const handleAddFieldGroup = (newGroup: Omit<FieldGroup, 'checklistTemplateId' | 'position' | 'updatedAt'>) => {
    if (readOnly) return;
    // New groups go last — `position` on the existing ones is already gap-free from however they
    // were created, so the current count is the next free slot.
    const created = addFieldGroup({
      ...newGroup,
      checklistTemplateId: checklistTemplate.id,
      position: checklistTemplate.fieldGroups.length,
    });

    // Update activeTab state to include the new field group
    setActiveTab(prev => ({
      ...prev,
      [created.id]: created.defaultTab ?? ChecklistFieldGroupTab.Home,
    }));

    // Update collapsedGroups state to include the new field group
    setCollapsedGroups(prev => ({
      ...prev,
      [created.id]: created.collapseDefault ?? false,
    }));
  };

  return (
    <>
      {renderBody()}
      <ChecklistFieldGroupAddGroup
        fieldGroups={getActiveFieldGroups(checklistTemplate.fieldGroups)}
        onAddFieldGroup={handleAddFieldGroup}
        onFieldAdded={onFieldAdded}
      />
    </>
  )
};
export default ChecklistFieldGroup;
