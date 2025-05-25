import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { useNavigate } from 'react-router-dom';
import CoreChecklistForm, { FormState } from './CoreChecklistForm';
import { calculateRepeat } from './calculateRepeat';
import { getDay } from './getDay';

const CreateCheclistForm = () => {
  const { addChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
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
    const { id } = addChecklistTemplate({
      title: checklistText,
      repeat,
      avatar: {
        type: 'icon',
        name: selectedIcon,
        color: selectedColor,
      },
      records: selectedRecords,
    });
    // If not repeat we need to create a checklist onetime.
    if (!repeat) {
      addChecklist({
        title: checklistText,
        checklistTemplateId: id,
        startedAt,
        endedAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
      });
    }
    navigate('/');
  };
  return (
    <CoreChecklistForm
      onSubmit={onSubmit}
      initialValues={
        {
          selectedRecords: [],
          checklistText: '',
          weeklyHobbies: [getDay()],
          startedAt: new Date().toISOString().split('T')[0],
          selectedIcon: 'material-symbols:checklist',
          selectedColor: '#607d8b',
        } as FormState
      }
    />
  );
};
export default CreateCheclistForm;
