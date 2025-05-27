import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import RecordDay from './components/RecordDay';
import {
  ChecklistTemplate,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import Note from './components/note/Note';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { BackHeader } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';

const DetailTaskPage = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate } = useChecklistTemplates();
  const { getRecordFields } = useRecordField();
  const { addChecklist } = useChecklist();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  const [metricFields, setMetricFields] = React.useState<RecordField[]>([]);
  const [noteFields, setNoteFields] = React.useState<RecordField[]>([]);

  const [checklistTemplate, setChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  if (!id || !currentDay) {
    return;
  }

  // Update checklistId Params
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    setChecklistTemplate(checklistTemplate);
    // Should create checklist id if non exist
    if (!checklistId && checklistTemplate) {
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
    }
  }, [checklistId]);

  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    const fields = getRecordFields(checklistTemplate?.records);
    if (fields.length) {
      const metricFields = fields.filter(field => field.type === 'metric');
      const noteFields = fields.filter(field => field.type === 'note');
      setMetricFields(metricFields);
      setNoteFields(noteFields);
    }
  }, []);
  const navigate = useNavigate();
  if (!checklistId) {
    return null;
  }
  return (
    <>
      <BackHeader
        renderLeftComponent={() => <div>{checklistTemplate?.title}</div>}
        renderRightComponent={() => (
          <Icon
            onClick={() => {
              navigate(`/edit-checklist/${id}`);
            }}
            width={24}
            icon="solar:pen-new-square-linear"
          />
        )}
        onClickLeftButton={() => navigate('/')}
      />
      {metricFields.length ? (
        <RecordDay
          checklistTemplateId={id}
          checklistId={checklistId}
          currentDay={currentDay}
          fields={metricFields}
        />
      ) : null}
      {noteFields.length ? (
        <Note
          fields={noteFields}
          checklistId={checklistId}
          checklistTemplateId={id}
          currentDay={currentDay}
        />
      ) : null}
    </>
  );
};

export default DetailTaskPage;
