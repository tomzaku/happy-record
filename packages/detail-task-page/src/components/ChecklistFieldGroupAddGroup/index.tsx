import React from 'react';
import ChecklistFieldGroupAddGroupMobile from './index.mobile';
import ChecklistFieldGroupAddGroupDesktop from './index.desktop';
import { useIsMobile, useRecordField, RecordField } from '@dreamer/global';
import { FieldGroup } from '@dreamer/global';

interface ChecklistFieldGroupAddGroupProps {
  fieldGroups?: FieldGroup[];
  onAddFieldGroup: (newGroup: FieldGroup) => void;
  availableFields?: string[];
  onFieldAdded?: (newField: RecordField) => void;
}

const ChecklistFieldGroupAddGroup = ({
  fieldGroups = [],
  onAddFieldGroup,
  availableFields,
  onFieldAdded,
}: ChecklistFieldGroupAddGroupProps) => {
  const isMobile = useIsMobile();
  const { getAllRecordFields } = useRecordField();
  
  // Get available fields from record fields if not provided
  const actualAvailableFields = React.useMemo(() => {
    if (availableFields) {
      return availableFields;
    }
    return getAllRecordFields().map((field: RecordField) => field.id);
  }, [availableFields, getAllRecordFields]);

  // Get all record fields for display
  const allRecordFields = React.useMemo(() => {
    return getAllRecordFields();
  }, [getAllRecordFields]);
  
  if (isMobile) {
    return (
      <ChecklistFieldGroupAddGroupMobile
        fieldGroups={fieldGroups}
        onAddFieldGroup={onAddFieldGroup}
        availableFields={actualAvailableFields}
        allRecordFields={allRecordFields}
        onFieldAdded={onFieldAdded}
      />
    );
  }
  
  return (
    <ChecklistFieldGroupAddGroupDesktop
      fieldGroups={fieldGroups}
      onAddFieldGroup={onAddFieldGroup}
      availableFields={actualAvailableFields}
      allRecordFields={allRecordFields}
      onFieldAdded={onFieldAdded}
    />
  );
};

export default ChecklistFieldGroupAddGroup;
