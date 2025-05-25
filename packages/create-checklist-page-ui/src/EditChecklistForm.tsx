import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { useNavigate, useParams } from 'react-router-dom';
import CoreChecklistForm, { FormState } from './CoreChecklistForm';
import { calculateRepeat } from './calculateRepeat';
import { getDay } from './getDay';
import { getDaysFromRepeat } from './getDayFromRepeat';

const EditChecklistForm = () => {
  const { checklistTemplate } = useChecklistTemplates();
  const { id } = useParams<{ id: string }>();
  const template = checklistTemplate[id || ''];
  const { updateChecklistTemplate } = useChecklistTemplates();
  const navigate = useNavigate();
  const onSubmit = ({
    startedAt,
    selectedRecords,
    selectedColor,
    selectedIcon,
    checklistText,
    weeklyHobbies,
  }: FormState) => {
    const repeat = calculateRepeat({ weeklyHobbies });
    updateChecklistTemplate({
      id: template.id,
      records: selectedRecords,
      title: checklistText,
      repeat,
      avatar: {
        type: 'icon',
        name: selectedIcon,
        color: selectedColor,
      },
    });
    navigate('/');
  };
  return (
    <CoreChecklistForm
      onSubmit={onSubmit}
      initialValues={{
        selectedRecords: template.records,
        checklistText: template.title,
        weeklyHobbies: getDaysFromRepeat(template.repeat),
        startedAt: template?.repeat?.startedAt
          ? new Date(template.repeat.startedAt).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        selectedIcon: template?.avatar?.name,
        selectedColor: template?.avatar?.color || '#607d8b',
      }}
    />
  );
};

export default EditChecklistForm;
