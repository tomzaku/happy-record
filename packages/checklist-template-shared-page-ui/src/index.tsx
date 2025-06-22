import {
  ChecklistTemplate,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import { BackHeader } from '@dreamer/header';
import qs from 'qs';
import { useParams } from 'react-router-dom';
import TaskSharedCard from './components/task-shared-card';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button/src/DefaultButton';
import { useRecordField } from '@dreamer/global/src/store/record-field';

const ChecklistTemplateSharedPageUi = () => {
  const { getAllRecordFields, addRecordField } = useRecordField();
  const { addChecklistTemplate, getChecklistTemplate } =
    useChecklistTemplates();
  const { getChecklistDetail } = useChecklist();

  const params = useParams();
  console.log('PARAMS', params);
  const queryParams = qs.parse(location.search, { ignoreQueryPrefix: true });
  console.log('>>>>QS', queryParams);
  const handleSubmit = () => {
    const allFields = getAllRecordFields();
    const newFields = queryParams.fields.filter(f => {
      return !allFields.find(existingField => existingField.id == f.id);
    });
    newFields.forEach(f => {
      addRecordField(f, true);
    });
    if (!getChecklistDetail(queryParams.checklistTemplate.id)) {
      alert("You've have this task!!!");
    } else {
      addChecklistTemplate(queryParams.checklistTemplate);
    }
  };

  return (
    <div>
      <BackHeader />
      <Card>
        <TaskSharedCard
          checklistTemplate={queryParams.checklistTemplate}
          fields={queryParams.fields}
        />
        <Button onClick={handleSubmit}>Submit</Button>
      </Card>
    </div>
  );
};

export default ChecklistTemplateSharedPageUi;
