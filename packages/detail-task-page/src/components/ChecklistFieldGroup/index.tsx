import React from 'react';
import { Checklist, ChecklistTemplate } from '@dreamer/global';
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
import ChecklistFieldGroupAdd from '../ChecklistFieldGroupAdd';

type Props = {
  checklist: Checklist;
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
};

const ChecklistFieldGroup = ({
  checklist,
  checklistTemplate,
  fields,
}: Props) => {
  const [activeTab, setActiveTab] = React.useState(ChecklistFieldGroupTab.Home);
  const renderTitle = () => {
    const tabToTitle = {
      [ChecklistFieldGroupTab.Home]: 'Note',
      [ChecklistFieldGroupTab.History]: 'Note History',
      [ChecklistFieldGroupTab.Add]: 'Add Note',
    };
    return tabToTitle[activeTab];
  };
  return checklistTemplate.fieldGroups.map(fieldGroup => {
    return (
      <Card className={styles.cardContainer}>
        <ChecklistFieldGroupHeader
          activeTab={activeTab}
          onClickHome={() => setActiveTab(ChecklistFieldGroupTab.Home)}
          onClickHistory={() => setActiveTab(ChecklistFieldGroupTab.History)}
          onClickAdd={() => setActiveTab(ChecklistFieldGroupTab.Add)}
          renderTitle={renderTitle}
        />
        <ChecklistFieldGroupAdd
          fields={fieldGroup.fields.map(fieldId =>
            fields.find(field => field.id === fieldId),
          )}
        />
      </Card>
    );
  });
};
export default ChecklistFieldGroup;
