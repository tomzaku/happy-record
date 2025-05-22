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

const RecordToday = ({ id }: { id: string }) => {
  const intl = useIntl();
  const { getChecklistDetail } = useChecklist();
  const { getChecklistTemplate } = useChecklistTemplates();
  const [currentChecklist, setCurrentChecklist] = React.useState<Checklist>();
  const { getRecordFields } = useRecordField();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    RecordField[]
  >([]);
  const { addChecklistRecord } = useChecklistRecord();
  const [fieldRecord, setFieldRecord] =
    React.useState<Record<string, number | undefined>>();

  React.useEffect(() => {
    const currentChecklistTemp = getChecklistDetail(id);
    setCurrentChecklist(currentChecklistTemp);
    const checklistTemplate = getChecklistTemplate(
      currentChecklistTemp.checklistTemplateId,
    );
    const currentChecklistRecords = getRecordFields(checklistTemplate.records);
    setCurrentChecklistRecords(currentChecklistRecords);
    setFieldRecord(
      checklistTemplate.records.reduce(
        (acc, key) => ({ ...acc, [key]: undefined }),
        {},
      ),
    );
  }, [id]);

  return (
    <Card className={styles.container}>
      <Typography.Title level={3}>
        {intl.formatMessage({
          id: 'detail-task-page.record-today.label',
          defaultMessage: 'Record Today',
        })}
      </Typography.Title>
      {currentChecklistRecords.map((record, index) => {
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
          if (currentChecklist) {
            addChecklistRecord({
              checklistId: id,
              checklistTemplateId: currentChecklist.checklistTemplateId,
              date: new Date().toISOString(),
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
    </Card>
  );
};

export default RecordToday;
