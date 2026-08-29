import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Typography from '@moon-ui/typography';
import List from '@moon-ui/list';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';

import styles from './index.module.scss';

type Props = {
  record: ChecklistRecord;
  fields: RecordField[];
  setRecord: (record: ChecklistRecord) => void;
};

/**
 * Metric fields only now — a `type: 'note'` field isn't a per-day submitted record anymore (see
 * 20260829010000_notes_note_id_ownership.sql): it's one persistent note attached to the field
 * itself, edited on the group's Home tab alongside the group's own note (ChecklistFieldGroupView,
 * useNoteById.ts), not here. This component used to switch on `field.type` for exactly that
 * case; there's nothing left to switch on.
 */
const ChecklistFieldGeneral = ({ record, fields, setRecord }: Props) => {
  const { updateChecklistRecord } = useChecklistRecord();
  const field = fields.find(f => f.id === record.fieldId);
  if (!field) return;
  const [activeRecord, setActiveRecord] = React.useState<ChecklistRecord>();
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      <List.ItemMeta
        logo={<Icon width={24} icon={field.icon} />}
        title={field.title}
        rightComponent={
          activeRecord?.id === record.id ? (
            <>
              <Input
                value={activeRecord.value}
                ref={inputRef}
                autoFocus
                border="dash"
                className={styles.input}
                onChange={e => {
                  setActiveRecord({
                    ...record,
                    value: Number(e.target.value),
                  });
                }}
              />
              <Icon
                width={24}
                className={styles.icon}
                onClick={() => {
                  setActiveRecord(undefined);
                }}
                icon="proicons:cancel"
              />
              <Icon
                width={24}
                className={styles.icon}
                onClick={() => {
                  updateChecklistRecord(record.id, {
                    checklistTemplateId: record.checklistTemplateId,
                    value: Number(inputRef.current?.value),
                  });
                  setRecord({
                    ...record,
                    value: Number(inputRef.current?.value),
                  });
                  setActiveRecord(undefined);
                }}
                icon="material-symbols:check"
              />
            </>
          ) : (
            <>
              <Typography.Text> {record.value}</Typography.Text>
              <Icon
                width={24}
                className={styles.iconEdit}
                onClick={() => {
                  setActiveRecord(record);
                  setTimeout(() => inputRef?.current?.focus(), 100);
                }}
                icon="solar:pen-2-line-duotone"
              />
            </>
          )
        }
      />
    </>
  );
};

export default ChecklistFieldGeneral;
