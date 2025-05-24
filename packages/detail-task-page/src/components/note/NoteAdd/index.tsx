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
}: {
  fields: RecordField[];
  checklistId: string;
  checklistTemplateId: string;
  currentDay: string;
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
      <NoteEditor
        value={form.value}
        setValue={value => setForm({ ...form, value })}
      />
      <Button
        onClick={() => {
          addChecklistRecord({
            value: form.value,
            checklistId,
            checklistTemplateId: checklistTemplateId,
            date: currentDay,
            records: [
              {
                fieldId: selectedField.id,
                value: form.value,
              },
            ],
          });
        }}
      >
        Submit
      </Button>
    </div>
  );
};

export default NoteAdd;
