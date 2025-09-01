import React, { useState } from 'react';
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
import FocusZoneModal from '@dreamer/focus-zone-modal-ui';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';

const DetailTaskPageMobile = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getRecordFields } = useRecordField();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  const [checklistTemplate, setChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [fields, setFields] = React.useState<RecordField[]>([]);

  // Focus Zone Modal state
  const [isFocusZoneOpen, setIsFocusZoneOpen] = useState(false);

  if (!id || !currentDay) {
    return;
  }
  // Update checklistId Params
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    setChecklistTemplate(checklistTemplate);

    if (!checklistTemplate) return;

    const fieldResult = getRecordFields(
      checklistTemplate.fieldGroups
        ?.map(fieldGroup => fieldGroup.fields)
        .flat(),
    );

    setFields(fieldResult);
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
      />

      <FocusZoneModal
        visible={isFocusZoneOpen}
        taskId={id}
        taskTitle={checklistTemplate?.title}
        onDismiss={() => setIsFocusZoneOpen(false)}
        onOpenModal={() => setIsFocusZoneOpen(true)}
      />
    </>
  );
};

export default DetailTaskPageMobile;
