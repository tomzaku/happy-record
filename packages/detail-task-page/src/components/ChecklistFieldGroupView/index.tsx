import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Icon from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';

import Button from '@moon-ui/button/src/DefaultButton';
import { Checklist, ChecklistTemplate } from '@dreamer/global';
import { Block } from '@blocknote/core';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

import styles from './index.module.scss';
import NoteEditor from '../note/NoteEditor';
import { useIntl } from '@dreamer/translation';

type Props = {
  checklistTemplate: ChecklistTemplate;
  checklist: Checklist;
  fields: RecordField[];
  currentDay: string;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const ChecklistFieldGroupView = ({
  checklistTemplate,
  fields,
  currentDay,
}: Props) => {
  const intl = useIntl();
  const { getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    ChecklistRecord[]
  >([]);
  const reloadChecklistRecord = () => {
    const records = getChecklistRecords(checklistTemplate.id, {
      rangeDate: {
        from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
        to: new Date(
          new Date(currentDay).setHours(23, 59, 59, 999),
        ).toISOString(),
      },
      fieldIds: fields.map(field => field.id),
      sortDirection: 'desc',
    });
    setCurrentChecklistRecords(Object.values(records));
    return records;
  };
  React.useEffect(() => {
    reloadChecklistRecord();
  }, []);

  if (currentChecklistRecords.length === 0) {
    return (
      <div>
        {fields.map(recordField => {
          return (
            <div className={styles.itemEmptyContainer}>
              <List.ItemMeta
                logo={<Icon width={24} icon={recordField.icon} />}
                title={recordField.title}
              />
            </div>
          );
        })}

        <div className={styles.emptyContainer}>
          <Icon
            width={80}
            // color="#00000024"
            icon="clarity:sad-face-line"
            className={styles.iconEmpty}
          />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({
              id: 'ChecklistFieldGroupView.noRecord',
              defaultMessage: 'No record found',
            })}
          </Typography.Title>
          <Typography.Paragraph noMargin>
            {intl.formatMessage({
              id: 'ChecklistFieldGroupView.noRecordDescription',
              defaultMessage:
                'Submit your record to keep track of your progress',
            })}
          </Typography.Paragraph>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Icon
        width={100}
        color="rgba(16,154,0,0.16)"
        icon="ion:checkmark-done-circle-outline"
        className={styles.iconSuccess}
      />
      {fields.map(recordField => {
        if (recordField.type === 'metric') {
          const recordValues = Object.values(currentChecklistRecords)
            .flat()
            .filter(record => record.fieldId === recordField.id);
          const sumValue = sum(recordValues.map(record => record.value));
          return (
            <List.ItemMeta
              logo={<Icon width={24} icon={recordField.icon} />}
              title={recordField.title}
              rightComponent={
                <>
                  <Typography.Text>
                    {sumValue} {recordField.unit}
                  </Typography.Text>
                </>
              }
            />
          );
        } else {
          const latestRecord = Object.values(currentChecklistRecords)
            .flat()
            .find(record => record.fieldId === recordField.id);
          if (!latestRecord) {
            return null;
          }
          return (
            <>
              <List.ItemMeta
                logo={<Icon width={24} icon={recordField.icon} />}
                title={recordField.title}
              />
              <NoteEditor value={latestRecord.value} readOnly withoutBorder />
            </>
          );
        }
      })}
    </div>
  );
};
export default ChecklistFieldGroupView;
