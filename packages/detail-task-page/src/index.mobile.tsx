import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Checklist,
  useChecklist,
  useChecklistTemplates,
  useSyncedSelector,
} from '@dreamer/global';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { BackHeader } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';
import AiChecklistGenerate from './components/AiChecklistGenerate';

const DetailTaskPageMobile = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getAllRecordFields } = useRecordField();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  // Derived straight from each store's own function every render (see
  // useSyncedSelector) instead of snapshotted into local state from an
  // effect — a template/field synced in from another device now actually
  // shows up here instead of only refreshing when `checklistId` changes.
  const checklistTemplate = useSyncedSelector(getChecklistTemplate, id ?? '');
  const fields = useSyncedSelector(getAllRecordFields);
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [isAiModalVisible, setIsAiModalVisible] = React.useState(false);

  if (!id || !currentDay) {
    return;
  }
  // Load or create checklist. `addChecklist`/`setSearchParams` deliberately
  // not in the deps array — see index.desktop.tsx's matching effect for why
  // (addChecklist's own identity changes with the store it writes to,
  // which would retrigger creation every time this call succeeds).
  // `getChecklistDetail` IS included so a checklist completed/edited on
  // another device refreshes this page's own copy.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
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
  }, [checklistTemplate, checklistId, id, currentDay, getChecklistDetail]);

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
              onClick={() => setIsAiModalVisible(true)}
              width={24}
              icon="solar:magic-stick-3-bold-duotone"
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
        }}
      />
      <ChecklistFieldGroup
        checklist={checklist}
        checklistTemplate={checklistTemplate}
        fields={fields}
        currentDay={currentDay}
        onUpdateChecklistTemplate={(updatedTemplate) => {
          updateChecklistTemplate(updatedTemplate);
        }}
      />

      <AiChecklistGenerate
        visible={isAiModalVisible}
        onDismiss={() => setIsAiModalVisible(false)}
        mode="existing"
        existingTemplate={checklistTemplate}
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
