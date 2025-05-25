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
  checklistTemplateId,
  currentDay,
  onSubmit,
  fields,
}: {
  checklistTemplateId: string;
  currentDay: string;
  onSubmit?: () => void;
  fields: RecordField[];
}) => {
  const { getChecklistTemplate } = useChecklistTemplates();
  const [currentChecklistTemplate, setCurrentChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  const { addChecklistRecord } = useChecklistRecord();
  const [fieldRecord, setFieldRecord] = React.useState<
    Record<string, number | undefined>
  >(
    fields.reduce(
      (acc, { id }) => ({
        ...acc,
        [id]: undefined,
      }),
      {},
    ),
  );

  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(checklistTemplateId);
    setCurrentChecklistTemplate(checklistTemplate);
  }, [checklistTemplateId]);

  return (
    <>
      {fields.map(record => {
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
                      [record.id]: Number(e.target.value),
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
              checklistId: checklistTemplateId,
              checklistTemplateId: currentChecklistTemplate.id,
              date: currentDay,
              records: Object.entries(fieldRecord).map(([key, value]) => ({
                fieldId: key,
                value: value,
              })),
            });
            onSubmit?.();
          }
        }}
      >
        Submit
      </Button>
    </>
  );
};

export default RecordDayEdit;
