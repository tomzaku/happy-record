import React from 'react';
import {
  Checklist,
  ChecklistTemplate,
  FieldGroup,
  getActiveFieldGroups,
  getNextScheduledDayLabel,
  isFieldGroupActiveOnDay,
  useChecklist,
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
import ChecklistFieldGroupMenu from '../ChecklistFieldGroupMenu';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import ChecklistFieldGroupAddGroup from '../ChecklistFieldGroupAddGroup';

type Props = {
  checklist: Checklist;
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
  currentDay: string;
  onUpdateChecklistTemplate: (updatedTemplate: ChecklistTemplate) => void;
  onFieldAdded?: (newField: RecordField) => void;
};

const ChecklistFieldGroup = ({
  checklist,
  checklistTemplate,
  fields,
  currentDay,
  onUpdateChecklistTemplate,
  onFieldAdded,
}: Props) => {
  const { updateChecklist } = useChecklist();
  const intl = useIntl();
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
  // Shared by every place that changes one group in place (a note edit, the settings menu's
  // field/tab/name/collapse changes) — splices `checklistTemplate.fieldGroups` at `index`
  // directly, so `index` has to be the real position in that array (see renderBody's own note on
  // why archived groups are filtered out only after pairing with their real index).
  const updateFieldGroupAt = (index: number, updatedGroup: FieldGroup) => {
    onUpdateChecklistTemplate({
      ...checklistTemplate,
      fieldGroups: [
        ...checklistTemplate.fieldGroups.slice(0, index),
        updatedGroup,
        ...checklistTemplate.fieldGroups.slice(index + 1),
      ],
    });
  };

  const renderTab = ({
    fieldGroup,
    fieldDetails,
    index,
  }: {
    fieldGroup: FieldGroup;
    fieldDetails: RecordField[];
    index: number;
  }) => {
    let tabContent;

    switch (activeTab[fieldGroup.id]) {
      case ChecklistFieldGroupTab.Home: {
        tabContent = (
          <ChecklistFieldGroupView
            fieldGroup={fieldGroup}
            onUpdateNote={value =>
              updateFieldGroupAt(index, { ...checklistTemplate.fieldGroups[index], note: value })
            }
            checklistTemplateId={checklistTemplate.id}
          />
        );
        break;
      }
      case ChecklistFieldGroupTab.History: {
        tabContent = (
          <ChecklistFieldGroupHistory
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
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
            checklist={checklist}
            currentDay={currentDay}
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
            onUpdateNote={value =>
              updateFieldGroupAt(index, { ...checklistTemplate.fieldGroups[index], note: value })
            }
            checklistTemplateId={checklistTemplate.id}
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
    // Every update below (onUpdateNote, onUpdateFieldGroup, onSelectedFieldsChange) splices
    // `checklistTemplate.fieldGroups` at `index` directly, so `index` here has to stay the real
    // position in that array — filtering fieldGroups down to the active ones first and mapping
    // over the filtered array would hand those splices the wrong position for every group after
    // an archived one. Pairing with the original index before filtering keeps it correct.
    return checklistTemplate.fieldGroups
      .map((fieldGroup, index) => ({ fieldGroup, index }))
      .filter(({ fieldGroup }) => !fieldGroup.archivedAt)
      // Groups scheduled today float to the top; a stable sort keeps everything else in its
      // existing relative order (the splice indices above are already captured, so reordering
      // here only changes render order, never which position an update lands on).
      .sort((a, b) => {
        const aActive = isFieldGroupActiveOnDay(a.fieldGroup.repeat, new Date(currentDay));
        const bActive = isFieldGroupActiveOnDay(b.fieldGroup.repeat, new Date(currentDay));
        return aActive === bActive ? 0 : aActive ? -1 : 1;
      })
      .map(({ fieldGroup, index }) => {
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
                  fieldGroup={fieldGroup}
                  onUpdateFieldGroup={updatedGroup => updateFieldGroupAt(index, updatedGroup)}
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
            >
              <Hr classes={{ hr: styles.hr, container: styles.hrContainer }} />
              {renderTab({ fieldGroup, fieldDetails, index })}
            </motion.div>
          </Card>
        );
      });
  }
  const handleAddFieldGroup = (newGroup: FieldGroup) => {
    const updatedTemplate = {
      ...checklistTemplate,
      fieldGroups: [...checklistTemplate.fieldGroups, newGroup],
    };
    
    // Update activeTab state to include the new field group
    setActiveTab(prev => ({
      ...prev,
      [newGroup.id]: newGroup.defaultTab ?? ChecklistFieldGroupTab.Home,
    }));
    
    // Update collapsedGroups state to include the new field group
    setCollapsedGroups(prev => ({
      ...prev,
      [newGroup.id]: newGroup.collapseDefault ?? false,
    }));
    
    onUpdateChecklistTemplate(updatedTemplate);
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
