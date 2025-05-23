import React from 'react';
import {
  Checklist,
  ChecklistTemplate,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { Icon } from '@iconify/react';
import List from '@moon-ui/list';
import styles from './index.module.scss';
import Input from '@moon-ui/input';
import Button from '@moon-ui/button/src/DefaultButton';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';

const RecordDayEdit = ({
  id,
  currentDay,
}: {
  id: string;
  currentDay: string;
}) => {
  const { getChecklistTemplate } = useChecklistTemplates();
  const { getRecordFields } = useRecordField();
  const [currentChecklistTemplate, setCurrentChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  const [currentRecordFields, setCurrentRecordFields] = React.useState<
    RecordField[]
  >([]);
  const { addChecklistRecord } = useChecklistRecord();
  const [fieldRecord, setFieldRecord] =
    React.useState<Record<string, number | undefined>>();

  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    setCurrentChecklistTemplate(checklistTemplate);
    const currentChecklistRecords = getRecordFields(checklistTemplate.records);
    setCurrentRecordFields(currentChecklistRecords);
    setFieldRecord(
      checklistTemplate.records.reduce(
        (acc, key) => ({ ...acc, [key]: undefined }),
        {},
      ),
    );
  }, [id]);

  return (
    <>
      {currentRecordFields.map(record => {
        return (
          <List.ItemMeta
            logo={<Icon width={24} icon={record.icon} />}
            title={record.title}
            rightComponent={
              <>
                <Input
                  onChange={e => {
                    setFieldRecord({
                      ...fieldRecord,
                      [record.key]: Number(e.target.value),
                    });
                  }}
                  border="dash"
                  className={styles.input}
                  type="number"
                />
                <Typography.Text className={styles.unit}>
                  {record.unit}
                </Typography.Text>
              </>
            }
          />
        );
      })}
      <Button
        size="lg"
        className={styles.submitBtn}
        onClick={() => {
          if (currentChecklistTemplate) {
            addChecklistRecord({
              checklistId: id,
              checklistTemplateId: currentChecklistTemplate.id,
              date: currentDay,
              records: Object.entries(fieldRecord).map(([key, value]) => ({
                fieldId: key,
                value: value,
              })),
            });
          }
        }}
      >
        Submit
      </Button>
    </>
  );
};

export default RecordDayEdit;
