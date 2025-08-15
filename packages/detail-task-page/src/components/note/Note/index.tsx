import React from 'react';
import Card from '@moon-ui/card';
import styles from './index.module.scss';
import NoteHeader from '../NoteHeader';
import Typography from '@moon-ui/typography';
import NoteEditor from '@moon-ui/note-editor';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import NoteAdd from '../NoteAdd';
import NoteHistory from '../NoteHistory/NoteHistory';
import NoteHome from '../NoteHome';
import { RecordField } from '@dreamer/global/src/store/record-field';

export enum NoteTab {
  Home,
  Add,
  History,
}
const Note = ({
  fields,
  checklistId,
  checklistTemplateId,
  currentDay,
}: {
  fields: RecordField[];
  checklistId: string;
  checklistTemplateId: string;
  currentDay: string;
}) => {
  const [activeTab, setActiveTab] = React.useState<NoteTab>(NoteTab.Home);
  const renderTitle = () => {
    const tabToTitle = {
      [NoteTab.Home]: 'Note',
      [NoteTab.History]: 'Note History',
      [NoteTab.Add]: 'Add Note',
    };
    return tabToTitle[activeTab];
  };
  const renderBody = () => {
    switch (activeTab) {
      case NoteTab.Home: {
        return (
          <NoteHome
            currentDay={currentDay}
            checklistId={checklistId}
            checklistTemplateId={checklistTemplateId}
            fields={fields}
          />
        );
      }
      case NoteTab.Add: {
        return (
          <NoteAdd
            fields={fields}
            checklistId={checklistId}
            checklistTemplateId={checklistTemplateId}
            currentDay={currentDay}
            onSubmit={() => setActiveTab(NoteTab.History)}
          />
        );
      }
      case NoteTab.History: {
        return (
          <NoteHistory
            fields={fields}
            checklistId={checklistId}
            checklistTemplateId={checklistTemplateId}
            currentDay={currentDay}
          />
        );
      }
      default: {
        return null;
      }
    }
  };
  return (
    <Card className={styles.container}>
      <NoteHeader
        renderTitle={renderTitle}
        activeTab={activeTab}
        onClickHome={() => setActiveTab(NoteTab.Home)}
        onClickHistory={() => setActiveTab(NoteTab.History)}
        onClickAdd={() => setActiveTab(NoteTab.Add)}
      />
      <Hr classes={{ hr: styles.hr }} />
      {renderBody()}
    </Card>
  );
};

export default Note;
