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

import styles from './index.module.scss';
import { isToday } from 'date-fns/isToday';
import ChecklistFieldGroupAdd from '../ChecklistFieldGroupAdd';
import ChecklistFieldGroupHistory from '../ChecklistFieldGroupHistory';
import ChecklistFieldGroupView from '../ChecklistFieldGroupView';
import ChecklistFieldMetric from '../ChecklistFieldMetric';

type Props = {
  checklist: Checklist;
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
  currentDay: string;
};

const ChecklistFieldGroup = ({
  checklist,
  checklistTemplate,
  fields,
  currentDay,
}: Props) => {
  const today = isToday(currentDay);
  const { updateChecklist } = useChecklist();
  const [activeTab, setActiveTab] = React.useState<
    Record<string, ChecklistFieldGroupTab>
  >(
    checklistTemplate.fieldGroups.reduce((acc, fieldGroup) => {
      return {
        ...acc,
        [fieldGroup.id]: ChecklistFieldGroupTab.Home,
      };
    }, {}),
  );
  const renderTitle = (fieldGroup: FieldGroup) => {
    const tabToTitle = {
      [ChecklistFieldGroupTab.Home]: `${today ? 'Today' : new Date(currentDay).toLocaleDateString()}`,
      [ChecklistFieldGroupTab.History]: 'Record History',
      [ChecklistFieldGroupTab.Add]: 'Add Record',
      [ChecklistFieldGroupTab.Metric]: 'Metric',
    };
    // return tabToTitle[activeTab[fieldGroup.id]];
    return fieldGroup.title;
  };
  const renderTab = ({
    fieldGroup,
    fieldDetails,
  }: {
    fieldGroup: FieldGroup;
    fieldDetails: RecordField[];
  }) => {
    switch (activeTab[fieldGroup.id]) {
      case ChecklistFieldGroupTab.Home: {
        return (
          <ChecklistFieldGroupView
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
            checklist={checklist}
            currentDay={currentDay}
            fieldGroup={fieldGroup}
          />
        );
      }
      case ChecklistFieldGroupTab.History: {
        return (
          <ChecklistFieldGroupHistory
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
          />
        );
      }
      case ChecklistFieldGroupTab.Metric: {
        return (
          <ChecklistFieldMetric
            fields={fieldDetails}
            checklistTemplateId={checklistTemplate.id}
          />
        );
      }
      case ChecklistFieldGroupTab.Add: {
        return (
          <ChecklistFieldGroupAdd
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
            checklist={checklist}
            currentDay={currentDay}
            fieldGroup={fieldGroup}
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
      }
    }
  };
  return checklistTemplate.fieldGroups.map(fieldGroup => {
    const fieldDetails = fieldGroup.fields.map(fieldId =>
      fields.find(field => field.id === fieldId),
    );
    return (
      <Card className={styles.cardContainer}>
        <ChecklistFieldGroupHeader
          activeTab={activeTab[fieldGroup.id]}
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
        />
        {renderTab({ fieldGroup, fieldDetails })}
      </Card>
    );
  });
};
export default ChecklistFieldGroup;
