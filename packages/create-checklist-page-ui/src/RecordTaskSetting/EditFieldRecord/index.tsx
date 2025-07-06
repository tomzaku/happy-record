import React from 'react';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import CoreFieldRecord, { FormState } from '../CoreFieldRecord';

type Props = {
  className?: string;
  onSubmit?: (recordField: RecordField) => void;
  recordField: RecordField | null;
};

const EditFieldRecord = ({ className, onSubmit, recordField }: Props) => {
  const { updateRecordField } = useRecordField();

  const handleSubmit = (form: FormState) => {
    if (!recordField) return;

    const updatedRecordField = updateRecordField(recordField.id, {
      icon: form.icon,
      type: form.type,
      title: form.title,
      unit: form.unit,
      description: form.description,
    });

    if (updatedRecordField) {
      onSubmit?.(updatedRecordField);
    }
  };

  // Convert RecordField to FormState for initial values
  const getInitialValues = (): Partial<FormState> => {
    if (!recordField) return {};

    return {
      icon: recordField.icon,
      selectedIconColor: '#607d8b', // Default color, could be stored in recordField if needed
      type: recordField.type,
      title: recordField.title,
      unit: recordField.unit,
      description: recordField.description,
    };
  };

  return (
    <CoreFieldRecord
      className={className}
      initialValues={getInitialValues()}
      onSubmit={handleSubmit}
      submitButtonText="Update"
    />
  );
};

export default EditFieldRecord;
