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
import isToday from 'date-fns/isToday';

export enum RecordTab {
  Home,
  History,
  Metric,
  Add,
}

const RecordDay = ({ id, currentDay }: { id: string; currentDay: string }) => {
  const { getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    Record<string, ChecklistRecord[]>
  >({});
  React.useEffect(() => {
    const records = getChecklistRecords(id, {
      rangeDate: {
        from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
        to: new Date(
          new Date(currentDay).setHours(23, 59, 59, 999),
        ).toISOString(),
      },
    });
    console.log('records', records);
    setCurrentChecklistRecords(Object.values(records));
  }, [id]);
  const [activeTab, setActiveTab] = React.useState(RecordTab.Home);
  const hasRecords = Object.values(currentChecklistRecords).length;
  const today = isToday(currentDay);
  const renderBody = () => {
    switch (activeTab) {
      case RecordTab.Home: {
        return hasRecords ? (
          <RecordDayView id={id} records={currentChecklistRecords} />
        ) : (
          <RecordDayEdit id={id} currentDay={currentDay} />
        );
      }
      case RecordTab.Metric: {
        return <MetricRecordField checklistTemplateId={id} />;
      }
      case RecordTab.Add: {
        return <RecordDayEdit id={id} currentDay={currentDay} />;
      }
      case RecordTab.History: {
        return <RecordDayHistory checklistTemplateId={id} />;
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
