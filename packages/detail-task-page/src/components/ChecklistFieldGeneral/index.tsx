import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import NoteEditor from '@moon-ui/note-editor';
import Typography from '@moon-ui/typography';
import List from '@moon-ui/list';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';

import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import cx from 'classnames';
import { useAiChecklistRecordNoteGenerate } from '@dreamer/global/src/hook';

type Props = {
  record: ChecklistRecord;
  fields: RecordField[];
  setRecord: (record: ChecklistRecord) => void;
};

const ChecklistFieldGeneral = ({ record, fields, setRecord }: Props) => {
  const { updateChecklistRecord, deleteChecklistRecord } = useChecklistRecord();
  const field = fields.find(f => f.id === record.fieldId);
  if (!field) return;
  const [activeRecord, setActiveRecord] = React.useState<ChecklistRecord>();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [resetKey, setResetKey] = React.useState('original');
  // "/ai" inside the note-type editor below — see useAiChecklistRecordNoteGenerate.ts for why
  // this (not the plain useAiNoteGenerate) is what this specific editor uses: `record.id` lets
  // it resolve this record's own real note-type value server-side instead of generating with
  // zero awareness of it. Called unconditionally (same as the hooks above it) even though only
  // the 'note' branch below ever actually renders NoteEditor — harmless/inert otherwise.
  const { isPro, generate } = useAiChecklistRecordNoteGenerate(record.id);

  switch (field.type) {
    case 'metric': {
      return (
        <>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            // description={field.description}
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
    }
    case 'note':
    default: {
      return (
        <div>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            // rightComponent={
            //   activeRecord?.id !== record.id ? (
            //     <></>
            //   ) : (
            //     <>
            //       <Button
            //         type="dash"
            //         size="sm"
            //         className={styles.editButton}
            //         onClick={() => {
            //           setActiveRecord(undefined);
            //           setResetKey('reset-key');
            //         }}
            //       >
            //         <Icon
            //           width={12}
            //           className={styles.icon}
            //           icon="proicons:cancel"
            //         />
            //         Cancel
            //       </Button>
            //       <Button
            //         type="dash"
            //         size="sm"
            //         className={cx(styles.editButton, styles.highlight)}
            //         onClick={() => {
            //           updateChecklistRecord(record.id, {
            //             checklistTemplateId: record.checklistTemplateId,
            //             value: activeRecord.value,
            //           });
            //           setRecord({
            //             ...record,
            //             value: activeRecord.value,
            //           });
            //           setActiveRecord(undefined);
            //           setResetKey('save-key');
            //         }}
            //       >
            //         <Icon
            //           width={12}
            //           className={styles.successIcon}
            //           icon="material-symbols:check"
            //         />
            //         Save
            //       </Button>
            //     </>
            //   )
            // }
          />
          <NoteEditor
            key={resetKey}
            // withoutBorder
            value={
              // blocknote -> activeRecord?.id !== record.id ? record.value : activeRecord.value
              record.value
            }
            setValue={(value: unknown) => {
              setActiveRecord({
                ...record,
                value: value as string | number,
              });
              updateChecklistRecord(record.id, {
                checklistTemplateId: record.checklistTemplateId,
                value,
              });
              setRecord({
                ...record,
                value,
              });
            }}
            ai={{ isPro, generate }}
          />
        </div>
      );
    }
  }
};

export default ChecklistFieldGeneral;
