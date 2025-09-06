import React from 'react';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import CoreFieldRecord, { FormState } from '../CoreFieldRecord';

type Props = {
  className?: string;
  onSubmit?: (recordField: RecordField) => void;
  onCancel?: () => void;
};

const AddFieldRecordUi = ({ className, onSubmit, onCancel }: Props) => {
  const { addRecordField } = useRecordField();

  const handleSubmit = (form: FormState) => {
    const newRecordField = addRecordField(form);
    onSubmit?.(newRecordField);
  };

  return (
    <div className={className}>
      <CoreFieldRecord
        onSubmit={handleSubmit}
        onCancel={onCancel}
        submitButtonText="Add Field"
      />
    </div>
  );
};

export default AddFieldRecordUi;
