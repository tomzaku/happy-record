import { useFirebase } from '../useFirebase';

export const useGetChecklistTemplateApi = () => {
  const { get } = useFirebase();
  const getChecklistTemplateApi = async (id: string) => {
    const result = await get('checklist-template', id);
    return result;
  };
  return {
    getChecklistTemplateApi,
  };
};
