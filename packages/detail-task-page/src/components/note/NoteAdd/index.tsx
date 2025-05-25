import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import NoteEditor from '../NoteEditor';
import Select from '@moon-ui/select';

import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';

const NoteAdd = ({
  fields,
  checklistId,
  checklistTemplateId,
  currentDay,
  onSubmit,
}: {
  fields: RecordField[];
  checklistId: string;
  checklistTemplateId: string;
  currentDay: string;
  onSubmit?: () => void;
}) => {
  const [form, setForm] = React.useState({
    value: '',
  });
  const [selectedField, setSelectedField] = React.useState<RecordField>(
    fields[0],
  );
  const { addChecklistRecord } = useChecklistRecord();
  return (
    <div>
      {fields.length > 1 ? (
        <Select
          options={fields.map(field => ({
            ...field,
            value: field.id,
            label: field.title,
          }))}
          renderOption={option => option.title}
          renderInput={() => <div>{selectedField.title}</div>}
          onChange={(option, { close }) => {
            close();
            setSelectedField(option);
          }}
          classes={{
            container: styles.selectContainer,
          }}
        />
      ) : null}
      <NoteEditor
        value={form.value}
        setValue={value => setForm({ ...form, value })}
        classes={{
          contentEditableClassName: styles.contentEditor,
        }}
      />
      <Button
        onClick={() => {
          addChecklistRecord({
            value: form.value,
            checklistId,
            checklistTemplateId: checklistTemplateId,
            createdAt: currentDay,
            records: [
              {
                fieldId: selectedField.id,
                value: form.value,
              },
            ],
          });
          onSubmit?.();
        }}
        className={styles.submitButton}
      >
        Submit
      </Button>
    </div>
  );
};

export default NoteAdd;
