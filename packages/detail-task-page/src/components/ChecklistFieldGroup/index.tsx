import React from 'react';
import { Checklist, ChecklistTemplate, FieldGroup } from '@dreamer/global';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Card from '@moon-ui/card';
import ChecklistFieldGroupHeader, {
  ChecklistFieldGroupTab,
} from '../ChecklistFieldGroupHeader';
import List from '@moon-ui/list';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import Typography from '@moon-ui/typography';
import NoteEditor from '../note/NoteEditor';

import styles from './index.module.scss';
import { isToday } from 'date-fns/isToday';
import ChecklistFieldGroupAdd from '../ChecklistFieldGroupAdd';
import ChecklistFieldGroupHistory from '../ChecklistFieldGroupHistory';
import ChecklistFieldGroupView from '../ChecklistFieldGroupView';

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
    };
    return tabToTitle[activeTab[fieldGroup.id]];
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
      case ChecklistFieldGroupTab.Add: {
        return (
          <ChecklistFieldGroupAdd
            fields={fieldDetails}
            checklistTemplate={checklistTemplate}
            checklist={checklist}
            currentDay={currentDay}
            onSubmit={() => {
              setActiveTab({
                ...activeTab,
                [fieldGroup.id]: ChecklistFieldGroupTab.Home,
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
          renderTitle={() => renderTitle(fieldGroup)}
        />
        {renderTab({ fieldGroup, fieldDetails })}
      </Card>
    );
  });
};
export default ChecklistFieldGroup;
