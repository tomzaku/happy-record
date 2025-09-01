import React from 'react';
import ChecklistFieldGroupAddGroupMobile from './index.mobile';
import ChecklistFieldGroupAddGroupDesktop from './index.desktop';
import { useIsMobile } from '@dreamer/global';
import { FieldGroup } from '@dreamer/global';

interface ChecklistFieldGroupAddGroupProps {
  fieldGroups?: FieldGroup[];
  onAddFieldGroup: (newGroup: FieldGroup) => void;
  availableFields?: string[];
}

const ChecklistFieldGroupAddGroup = ({
  fieldGroups = [],
  onAddFieldGroup,
  availableFields = [],
}: ChecklistFieldGroupAddGroupProps) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <ChecklistFieldGroupAddGroupMobile
        fieldGroups={fieldGroups}
        onAddFieldGroup={onAddFieldGroup}
        availableFields={availableFields}
      />
    );
  }
  
  return (
    <ChecklistFieldGroupAddGroupDesktop
      fieldGroups={fieldGroups}
      onAddFieldGroup={onAddFieldGroup}
      availableFields={availableFields}
    />
  );
};

export default ChecklistFieldGroupAddGroup;
