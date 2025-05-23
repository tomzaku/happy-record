import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import RecordDay from './components/RecordDay';
import MetricRecordField from './components/MetricRecordField';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import Note from './components/note/Note';

const DetailTaskPage = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');
  if (!id || !currentDay) {
    return;
  }

  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
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
  return (
    <>
      <RecordDay id={id} currentDay={currentDay} />
      <Note />
    </>
  );
};

export default DetailTaskPage;
