import { useFirebase } from '../useFirebase';

export const useGetChecklistTemplateApi = () => {
  const { get } = useFirebase();
  const getChecklistTemplateApi = async (id: string) => {
    console.log('>>>>>>>>>>>>>GET???BEFORE');
    const result = await get('checklist-template', id);
    console.log('>>>>>>>>>>>>>GET???AFTER');
    return result;
  };
  return {
    getChecklistTemplateApi,
  };
};
