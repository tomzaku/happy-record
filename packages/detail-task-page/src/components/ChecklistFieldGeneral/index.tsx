import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import NoteEditor from '../note/NoteEditor';
import Typography from '@moon-ui/typography';
import List from '@moon-ui/list';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';

import styles from './index.module.scss';

type Props = {
  record: ChecklistRecord;
  fields: RecordField[];
};
const ChecklistFieldGeneral = ({ record, fields }: Props) => {
  const { updateChecklistRecord } = useChecklistRecord();
  const field = fields.find(f => f.id === record.fieldId);
  if (!field) return;
  const [activeRecord, setActiveRecord] = React.useState<ChecklistRecord>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  switch (field.type) {
    case 'metric': {
      return (
        <>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            description={field.description}
            rightComponent={
              activeRecord?.id === record.id ? (
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
                  onBlur={() => {
                    updateChecklistRecord(record.id, {
                      checklistTemplateId: record.checklistTemplateId,
                      value: Number(inputRef.current?.value),
                    });
                    // setRecords(prev => {
                    //   return {
                    //     ...prev,
                    //     [key]: prev[key].map(record => {
                    //       if (record.id === r.id) {
                    //         return {
                    //           ...record,
                    //           value: Number(inputRef.current?.value),
                    //         };
                    //       }
                    //       return record;
                    //     }),
                    //   };
                    // });
                    // setEditActiveId('');
                  }}
                />
              ) : (
                <>
                  <Typography.Text> {record.value}</Typography.Text>
                  <Icon
                    width={24}
                    className={styles.iconEdit}
                    onClick={() => {
                      setActiveRecord(record);
                      // setTimeout(() => inputRef?.current?.focus(), 100);
                    }}
                    icon="solar:pen-2-line-duotone"
                  />
                </>
              )
            }
          />
        </>
      );
    }
    case 'note':
    default: {
      return (
        <div>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
          />
          <NoteEditor withoutBorder value={record.value} />
        </div>
      );
    }
  }
};

export default ChecklistFieldGeneral;
