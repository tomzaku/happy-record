import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import NoteEditor from '../note/NoteEditor/';
import { v4 } from 'uuid';

import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import { Checklist, ChecklistTemplate } from '@dreamer/global';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import {
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isToday,
} from 'date-fns';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import { useIntl } from '@dreamer/translation';
import WeeklyRow from '../WeeklyRow';

type Props = {
  fields: RecordField[];
  checklistTemplate: ChecklistTemplate;
  checklist: Checklist;
  currentDay: string;
  onSubmit?: () => void;
};

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const ChecklistFieldGroupAdd = ({
  fields,
  checklistTemplate,
  checklist,
  currentDay,
  onSubmit,
}: Props) => {
  const getEmptyFieldRecord = () => {
    return fields.reduce(
      (acc, { id }) => ({
        ...acc,
        [id]: undefined,
      }),
      {},
    );
  };
  const [fieldRecord, setFieldRecord] = React.useState<
    Record<string, number | undefined | unknown[]>
  >(getEmptyFieldRecord());
  const { addChecklistRecord } = useChecklistRecord();
  const { getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    ChecklistRecord[]
  >([]);
  // For force rerender of note editor after submit
  const [newNoteKey, setNewNoteKey] = React.useState(v4());

  // Add ref to track previous records for shake animation
  const prevRecordsRef = React.useRef<ChecklistRecord[]>([]);

  // State for shake animation
  const [isShaking, setIsShaking] = React.useState(false);

  // Trigger shake animation when records change
  React.useEffect(() => {
    if (currentChecklistRecords.length > prevRecordsRef.current.length) {
      // Shake animation when new records are added
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    }
    prevRecordsRef.current = currentChecklistRecords;
  }, [currentChecklistRecords]);

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
    // Flatten the records object into an array
    const flattenedRecords = Object.values(records).flat();
    setCurrentChecklistRecords(flattenedRecords);
    return records;
  };
  const today = isToday(currentDay);
  const intl = useIntl();
  React.useEffect(() => {
    reloadChecklistRecord();
  }, [currentDay]);
  const renderEmpty = () => {
    return (
      <div>
        <div className={styles.emptyContainer}>
          <Icon
            width={80}
            // color="#00000024"
            icon="clarity:sad-face-line"
            className={styles.iconEmpty}
          />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage(
              {
                id: 'ChecklistFieldGroupView.noRecord',
                defaultMessage: 'No record found on {{day}}',
              },
              {
                day: today
                  ? intl.formatMessage({
                      id: 'ChecklistFieldGroupView.today',
                      defaultMessage: 'today',
                    })
                  : new Date(currentDay).toLocaleDateString(),
              },
            )}
          </Typography.Title>
          <Typography.Paragraph noMargin onClick={() => {}} style={{}}>
            {intl.formatMessage({
              id: 'ChecklistFieldGroupView.noRecordDescription',
              defaultMessage:
                'Submit your record to keep track of your progress',
            })}
          </Typography.Paragraph>
        </div>
      </div>
    );
  };
  const renderCurrentDay = () => {
    return (
      <div className={styles.historyContainer}>
        <div className={styles.historyBody}>
          <Icon
            width={100}
            color="rgba(16,154,0,0.1)"
            icon="ion:checkmark-done-circle-outline"
            className={`${styles.iconSuccess} ${isShaking ? styles.shake : ''}`}
          />
          <Typography.Title level={4}>
            {intl.formatMessage(
              {
                id: 'ChecklistFieldGroupView.record-day',
                defaultMessage: 'Record on {{day}}',
              },
              {
                day: today
                  ? intl.formatMessage({
                      id: 'ChecklistFieldGroupView.current-day',
                      defaultMessage: 'today',
                    })
                  : new Date(currentDay).toLocaleDateString(),
              },
            )}
          </Typography.Title>
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
                      <Typography.Title
                        level={1}
                        noMargin
                        className={styles.sumValueText}
                      >
                        {sumValue}
                      </Typography.Title>
                      <Typography.Text>{recordField.unit}</Typography.Text>
                    </>
                  }
                />
              );
            } else {
              const latestRecord = currentChecklistRecords.find(
                record => record.fieldId === recordField.id,
              );
              if (!latestRecord) {
                return null;
              }
              return (
                <>
                  <List.ItemMeta
                    logo={<Icon width={24} icon={recordField.icon} />}
                    title={recordField.title}
                  />
                  <NoteEditor
                    key={latestRecord.id}
                    value={latestRecord.value}
                    readOnly
                    withoutBorder
                  />
                </>
              );
            }
          })}
        </div>
      </div>
    );
  };
  return (
    <>
      <WeeklyRow currentDay={currentDay} />
      {fields.map(field => {
        // const field = fields.find(f => f.id === fieldId)
        switch (field?.type) {
          case 'metric': {
            return (
              <List.ItemMeta
                logo={<Icon width={24} icon={field.icon} />}
                title={field.title}
                rightComponent={
                  <>
                    <Input
                      suffix={field.unit}
                      value={`${fieldRecord[field.id]}`}
                      onChange={e => {
                        setFieldRecord({
                          ...fieldRecord,
                          [field.id]: Number(e.target.value),
                        });
                      }}
                      border="dash"
                      className={styles.input}
                      type="number"
                    />
                    {/* <Typography.Text className={styles.unit}> {field.unit} */}
                    {/* </Typography.Text> */}
                  </>
                }
              />
            );
          }
          case 'note': {
            return (
              <>
                <List.ItemMeta
                  logo={<Icon width={24} icon={field.icon} />}
                  title={field.title}
                />
                <NoteEditor
                  key={newNoteKey}
                  withoutBorder
                  value={fieldRecord?.[field.id]}
                  setValue={value => {
                    setFieldRecord({
                      ...fieldRecord,
                      [field.id]: value,
                    });
                  }}
                />
              </>
            );
          }
        }
      })}
      <div className={styles.footerCenter}>
        <Button
          size="lg"
          className={styles.submitBtn}
          onClick={() => {
            if (checklistTemplate) {
              const now = new Date();

              // Create a new date with the same day/month/year as currentDay but with the current time
              const newDate = setHours(
                setMinutes(
                  setSeconds(
                    setMilliseconds(
                      new Date(currentDay),
                      now.getMilliseconds(),
                    ),
                    now.getSeconds(),
                  ),
                  now.getMinutes(),
                ),
                now.getHours(),
              );

              const result = addChecklistRecord({
                checklistId: checklist.id,
                checklistTemplateId: checklistTemplate.id,
                createdAt: newDate.toISOString(),
                records: Object.entries(fieldRecord).map(([key, value]) => ({
                  fieldId: key,
                  value: value,
                })),
              });
              setCurrentChecklistRecords([
                ...result,
                ...currentChecklistRecords,
              ]);
              setFieldRecord(getEmptyFieldRecord());
              setNewNoteKey(v4());
              onSubmit?.();
            }
          }}
        >
          Submit
        </Button>
      </div>
      <Hr />
      {currentChecklistRecords.length === 0
        ? renderEmpty()
        : renderCurrentDay()}
    </>
  );
};
export default ChecklistFieldGroupAdd;
