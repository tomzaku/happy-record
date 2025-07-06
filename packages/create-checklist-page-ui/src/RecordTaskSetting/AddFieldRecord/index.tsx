import React from 'react';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import CoreFieldRecord, { FormState } from '../CoreFieldRecord';

type Props = {
  className?: string;
  onSubmit?: (recordField: RecordField) => void;
};

const AddFieldRecord = ({ className, onSubmit }: Props) => {
  const { addRecordField } = useRecordField();

  const handleSubmit = (form: FormState) => {
    const newRecordField = addRecordField(form);
    onSubmit?.(newRecordField);
  };

  return (
    <CoreFieldRecord
      className={className}
      onSubmit={handleSubmit}
      submitButtonText="Save"
    />
  );
};

export default AddFieldRecord;
