import React from 'react';
import {
  Checklist,
  useChecklist,
  useChecklistTemplateDetail,
} from '@dreamer/global';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { Icon } from '@moon-ui/icon/Icon';
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
  const { template: currentChecklistTemplate } = useChecklistTemplateDetail(checklistTemplateId);
  const { addChecklistRecord } = useChecklistRecord();
  const getEmptyFieldRecord = () =>
    fields.reduce(
      (acc, { id }) => ({
        ...acc,
        [id]: undefined,
      }),
      {},
    );
  const [fieldRecord, setFieldRecord] = React.useState<
    Record<string, number | undefined>
  >(getEmptyFieldRecord());
  // `Input` only reads its `value` prop once, at mount (see @moon-ui/input) —
  // it's uncontrolled after that, so resetting `fieldRecord` alone leaves
  // whatever's already typed sitting in the DOM. Bumping this and keying
  // each Input on it forces a real remount, the same trick AddInlineTask
  // and ChecklistFieldGroupAdd already use for the same reason.
  const [resetKey, setResetKey] = React.useState(0);

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
                  key={`${record.id}-${resetKey}`}
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
      <div className={styles.footerCenter}>
        <Button
          size="lg"
          className={styles.submitBtn}
          onClick={() => {
            if (currentChecklistTemplate) {
              addChecklistRecord({
                checklistId: checklistTemplateId,
                checklistTemplateId: currentChecklistTemplate.id,
                createdAt: currentDay,
                records: Object.entries(fieldRecord).map(([key, value]) => ({
                  fieldId: key,
                  value: value,
                })),
              });
              setFieldRecord(getEmptyFieldRecord());
              setResetKey(prev => prev + 1);
              onSubmit?.();
            }
          }}
        >
          Submit
        </Button>
      </div>
    </>
  );
};

export default RecordDayEdit;
