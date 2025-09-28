import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Checklist,
  ChecklistTemplate,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { BackHeader } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';

const DetailTaskPageMobile = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getAllRecordFields } = useRecordField();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  const [checklistTemplate, setChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [fields, setFields] = React.useState<RecordField[]>([]);


  // Function to update fields based on current checklistTemplate
  const updateFields = React.useCallback(() => {
    if (!checklistTemplate) return;
    
    // Get all available fields, not just the ones already assigned to groups
    const allFields = getAllRecordFields();
    setFields(allFields);
  }, [checklistTemplate]);

  if (!id || !currentDay) {
    return;
  }
  // Update checklistId Params
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    setChecklistTemplate(checklistTemplate);

    if (!checklistTemplate) return;

    if (checklistId) {
      const checklist = getChecklistDetail(checklistId);
      setChecklist(checklist);
    } else {
      // Should create checklist id if non exist
      const checklist = addChecklist({
        title: checklistTemplate.title,
        checklistTemplateId: id,
        startedAt: new Date(currentDay).toISOString(),
        endedAt: new Date(currentDay).toISOString(),
      });
      setSearchParams({
        ...Object.fromEntries(search),
        checklistId: checklist.id,
      });
      setChecklist(checklist);
    }
  }, [checklistId]);

  // Update fields when checklistTemplate changes
  React.useEffect(() => {
    updateFields();
  }, [updateFields]);

  // Callback for when new fields are added
  const handleFieldAdded = React.useCallback(() => {
    // Refresh fields to include the new field
    updateFields();
  }, [updateFields]);


  const navigate = useNavigate();
  if (!checklistId || !checklist || !checklistTemplate) {
    return null;
  }
  return (
    <>
      <BackHeader
        renderLeftComponent={() => <div>{checklistTemplate?.title}</div>}
        renderRightComponent={() => (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Icon
              onClick={() => {
                setIsFocusZoneOpen(true);
              }}
              width={24}
              icon="material-symbols:psychology"
              style={{ cursor: 'pointer' }}
            />
            <Icon
              onClick={() => {
                navigate(`/edit-checklist/${id}`);
              }}
              width={24}
              icon="solar:pen-new-square-linear"
            />
          </div>
        )}
        onClickLeftButton={() => navigate('/')}
      />
      <ChecklistGenericInfo
        isDefaultCollapsed
        checklistTemplate={checklistTemplate}
        onUpdate={(updatedTemplate) => {
          updateChecklistTemplate(updatedTemplate);
          setChecklistTemplate(updatedTemplate);
        }}
      />
      <ChecklistFieldGroup
        checklist={checklist}
        checklistTemplate={checklistTemplate}
        fields={fields}
        currentDay={currentDay}
        onUpdateChecklistTemplate={(updatedTemplate) => {
          updateChecklistTemplate(updatedTemplate);
          setChecklistTemplate(updatedTemplate);
          // Fields will be updated automatically via useEffect
        }}
        onFieldAdded={handleFieldAdded}
      />

      {/* <FocusZoneModal */}
      {/*   visible={isFocusZoneOpen} */}
      {/*   taskId={id} */}
      {/*   taskTitle={checklistTemplate?.title} */}
      {/*   onDismiss={() => setIsFocusZoneOpen(false)} */}
      {/*   onOpenModal={() => setIsFocusZoneOpen(true)} */}
      {/* /> */}
    </>
  );
};

export default DetailTaskPageMobile;
