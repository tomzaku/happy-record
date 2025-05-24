import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import Card from '@moon-ui/card';
import RecordDayView from '../RecordDayView';
import RecordDayEdit from '../RecordDayEdit';

import styles from './index.module.scss';
import MetricRecordField from '../MetricRecordField';
import RecordHeader from '../RecordHeader';
import RecordDayHistory from '../RecordDayHistory';
import Typography from '@moon-ui/typography';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import { isToday } from 'date-fns/isToday';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { useChecklist } from '@dreamer/global';

export enum RecordTab {
  Home,
  History,
  Metric,
  Add,
}

const RecordDay = ({
  checklistId,
  currentDay,
  fields,
  checklistTemplateId,
}: {
  checklistId: string;
  checklistTemplateId: string;
  currentDay: string;
  fields: RecordField[];
}) => {
  const { getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    Record<string, ChecklistRecord[]>
  >({});
  const { updateChecklist } = useChecklist();

  const reloadChecklistRecord = () => {
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
        to: new Date(
          new Date(currentDay).setHours(23, 59, 59, 999),
        ).toISOString(),
      },
      fieldIds: fields.map(field => field.id),
    });
    setCurrentChecklistRecords(Object.values(records));
    return records;
  };

  React.useEffect(() => {
    const records = reloadChecklistRecord();
    setActiveTab(
      Object.values(records).length ? RecordTab.Home : RecordTab.Add,
    );
  }, [checklistTemplateId]);
  const hasRecords = Object.values(currentChecklistRecords).length;
  const [activeTab, setActiveTab] = React.useState(
    hasRecords ? RecordTab.Home : RecordTab.Add,
  );
  const today = isToday(currentDay);
  const renderBody = () => {
    switch (activeTab) {
      case RecordTab.Home: {
        return (
          <RecordDayView
            checklistTemplateId={checklistTemplateId}
            fields={fields}
            currentDay={currentDay}
          />
        );
      }
      case RecordTab.Metric: {
        return (
          <MetricRecordField
            checklistTemplateId={checklistTemplateId}
            fields={fields}
          />
        );
      }
      case RecordTab.Add: {
        return (
          <RecordDayEdit
            checklistTemplateId={checklistTemplateId}
            currentDay={currentDay}
            onSubmit={() => {
              setActiveTab(RecordTab.Home);
              updateChecklist({
                id: checklistId,
                completedAt: new Date().toISOString(),
              });
            }}
            fields={fields}
          />
        );
      }
      case RecordTab.History: {
        return (
          <RecordDayHistory
            checklistTemplateId={checklistTemplateId}
            fields={fields}
          />
        );
      }
      default: {
        return null;
      }
    }
  };
  const renderTitle = () => {
    const tabToTitle = {
      [RecordTab.Home]: `${today ? 'Today' : new Date(currentDay).toLocaleDateString()}`,
      [RecordTab.History]: 'History',
      [RecordTab.Metric]: 'Metric',
      [RecordTab.Add]: `Record ${today ? 'Today' : `${new Date(currentDay).toLocaleDateString()}`}`,
    };
    return (
      <Typography.Title noMargin level={3}>
        {tabToTitle[activeTab]}
      </Typography.Title>
    );
  };
  return (
    <Card className={styles.container}>
      <RecordHeader
        onClickHome={() => setActiveTab(RecordTab.Home)}
        onClickHistory={() => setActiveTab(RecordTab.History)}
        onClickMetric={() => setActiveTab(RecordTab.Metric)}
        onClickAdd={() => setActiveTab(RecordTab.Add)}
        activeTab={activeTab}
        renderTitle={renderTitle}
      />
      <Hr classes={{ hr: styles.hr }} />
      {renderBody()}
    </Card>
  );
};

export default RecordDay;
