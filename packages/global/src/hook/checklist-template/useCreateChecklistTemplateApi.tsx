import { useFirebase } from '../useFirebase';

export const useCreateChecklistTemplate = () => {
  const { upload } = useFirebase();
  const updateChecklistTemplate = async (data: unknown) => {
    const result = await upload(data, 'checklist-template');
    return { id: result.id };
  };
  return {
    updateChecklistTemplate,
  };
};
