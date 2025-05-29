import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import NoteEditor from '../note/NoteEditor';

import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import { Checklist, ChecklistTemplate } from '@dreamer/global';
import { Block } from '@blocknote/core';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

type Props = {
  fields: RecordField[];
  checklistTemplate: ChecklistTemplate;
  checklist: Checklist;
  currentDay: string;
  onSubmit?: () => void;
};
const ChecklistFieldGroupAdd = ({
  fields,
  checklistTemplate,
  checklist,
  currentDay,
  onSubmit,
}: Props) => {
  const [fieldRecord, setFieldRecord] = React.useState<
    Record<string, number | undefined | Block[]>
  >(
    fields.reduce(
      (acc, { id }) => ({
        ...acc,
        [id]: undefined,
      }),
      {},
    ),
  );
  const { addChecklistRecord } = useChecklistRecord();
  return (
    <>
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
                    <Typography.Text className={styles.unit}>
                      {field.unit}
                    </Typography.Text>
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

              addChecklistRecord({
                checklistId: checklist.id,
                checklistTemplateId: checklistTemplate.id,
                createdAt: newDate.toISOString(),
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
      </div>
    </>
  );
};
export default ChecklistFieldGroupAdd;
