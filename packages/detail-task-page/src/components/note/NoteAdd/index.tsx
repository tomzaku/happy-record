import React from 'react';
import { v4 } from 'uuid';
import { RecordField } from '@dreamer/global/src/store/record-field';
import NoteEditor from '@moon-ui/note-editor';
import Select from '@moon-ui/select';

import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { useAiNoteGenerate } from '@dreamer/global/src/hook';

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
  // NoteEditor only reads its `value` prop once, at mount (see
  // @moon-ui/note-editor) — it's uncontrolled after that, so resetting
  // `form` alone leaves whatever was typed still on screen. Bumping this
  // and keying NoteEditor on it forces a real remount, same as
  // ChecklistFieldGroupAdd does for the same reason.
  const [resetKey, setResetKey] = React.useState(v4());
  const { addChecklistRecord } = useChecklistRecord();
  // "/ai" inside the editor below — see add-note-page-ui's own AddNotePage for the same wiring.
  const { isPro, generate } = useAiNoteGenerate();
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
        key={resetKey}
        value={form.value}
        setValue={value => setForm({ ...form, value })}
        ai={{ isPro, generate }}
      />
      <div className={styles.footerCenter}>
        <Button
          type="primary"
          className={styles.submitButton}
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
            setForm({ value: '' });
            setResetKey(v4());
            onSubmit?.();
          }}
        >
          Submit
        </Button>
      </div>
    </div>
  );
};

export default NoteAdd;
