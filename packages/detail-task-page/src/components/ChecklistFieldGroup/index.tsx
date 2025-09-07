import React from 'react';
import {
  Checklist,
  ChecklistTemplate,
  FieldGroup,
  useChecklist,
} from '@dreamer/global';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Card from '@moon-ui/card';
import ChecklistFieldGroupHeader, {
  ChecklistFieldGroupTab,
} from '../ChecklistFieldGroupHeader';
import { AnimatePresence, motion } from 'motion/react';

import styles from './index.module.scss';
import ChecklistFieldGroupAdd from '../ChecklistFieldGroupAdd';
import ChecklistFieldGroupHistory from '../ChecklistFieldGroupHistory';
import ChecklistFieldGroupView from '../ChecklistFieldGroupView';
import ChecklistFieldMetric from '../ChecklistFieldMetric';
import ChecklistFieldGroupConfig from '../ChecklistFieldGroupConfig';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import ChecklistFieldGroupAddGroup from '../ChecklistFieldGroupAddGroup';

type Props = {
  checklist: Checklist;
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
  currentDay: string;
  onUpdateChecklistTemplate: (updatedTemplate: ChecklistTemplate) => void;
};

const ChecklistFieldGroup = ({
  checklist,
  checklistTemplate,
  fields,
  currentDay,
  onUpdateChecklistTemplate,
}: Props) => {
  const { updateChecklist } = useChecklist();
  const [activeTab, setActiveTab] = React.useState<
    Record<string, ChecklistFieldGroupTab>
  >(
    checklistTemplate.fieldGroups.reduce((acc, fieldGroup) => {
      return {
        ...acc,
        [fieldGroup.id]: fieldGroup.defaultTab ?? ChecklistFieldGroupTab.Home,
      };
    }, {}),
  );
  const [collapsedGroups, setCollapsedGroups] = React.useState<
    Record<string, boolean>
  >(
    checklistTemplate.fieldGroups.reduce((acc, fieldGroup) => {
      return {
        ...acc,
        [fieldGroup.id]: fieldGroup.collapseDefault ?? false,
      };
    }, {}),
  );

  const toggleCollapse = (fieldGroupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [fieldGroupId]: !prev[fieldGroupId],
    }));
  };

  const renderTitle = (fieldGroup: FieldGroup) => {
    return fieldGroup.title;
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
            onUpdateNote={value => {
              onUpdateChecklistTemplate({
                ...checklistTemplate,
                fieldGroups: [
                  ...checklistTemplate.fieldGroups.slice(0, index),
                  {
                    ...checklistTemplate.fieldGroups[index],
                    note: value,
                  },
                  ...checklistTemplate.fieldGroups.slice(index + 1),
                ],
              });
            }}
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
      case ChecklistFieldGroupTab.Config: {
        tabContent = (
          <ChecklistFieldGroupConfig
            fieldGroup={fieldGroup}
            onUpdateFieldGroup={updatedGroup => {
              onUpdateChecklistTemplate({
                ...checklistTemplate,
                fieldGroups: [
                  ...checklistTemplate.fieldGroups.slice(0, index),
                  updatedGroup,
                  ...checklistTemplate.fieldGroups.slice(index + 1),
                ],
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
            onUpdateNote={value => {
              onUpdateChecklistTemplate({
                ...checklistTemplate,
                fieldGroups: [
                  ...checklistTemplate.fieldGroups.slice(0, index),
                  {
                    ...checklistTemplate.fieldGroups[index],
                    note: value,
                  },
                  ...checklistTemplate.fieldGroups.slice(index + 1),
                ],
              });
            }}
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
    return checklistTemplate.fieldGroups.map((fieldGroup, index) => {
      const fieldDetails = fieldGroup.fields
        .map(fieldId => fields.find(field => field.id === fieldId))
        .filter((field): field is RecordField => field !== undefined);
      const isCollapsed = collapsedGroups[fieldGroup.id] || false;

      return (
        <Card key={fieldGroup.id} className={styles.cardContainer}>
          <ChecklistFieldGroupHeader
            activeTab={activeTab[fieldGroup.id]}
            activeTabs={
              fieldGroup.activeTabs ?? [
                ChecklistFieldGroupTab.Home,
                ChecklistFieldGroupTab.History,
                ChecklistFieldGroupTab.Metric,
                ChecklistFieldGroupTab.Config,
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
            onClickConfig={() =>
              setActiveTab({
                ...activeTab,
                [fieldGroup.id]: ChecklistFieldGroupTab.Config,
              })
            }
            renderTitle={() => renderTitle(fieldGroup)}
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
            <Hr classes={{ hr: styles.hr }} />
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
    onUpdateChecklistTemplate(updatedTemplate);
  };

  return (
    <>
      {renderBody()}
      <ChecklistFieldGroupAddGroup
        fieldGroups={checklistTemplate.fieldGroups}
        onAddFieldGroup={handleAddFieldGroup}
      />
    </>
  )
};
export default ChecklistFieldGroup;
