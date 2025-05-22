import { useLocalStorage } from '../../hook';

const RECORD_KEY = 'record-field';

export type RecordField = {
  key: string;
  title: string;
  icon: string;
  description: string;
  type: string;
  unit: string;
};

const defaultRecordField = {
  duration: {
    key: 'duration',
    title: 'Duration',
    icon: 'solar:clock-square-broken',
    description: 'Record duration for tracking purpose',
    type: 'number',
    unit: 'minutes',
  },
  'push-ups': {
    key: 'push-ups',
    title: 'Push-ups',
    icon: 'solar:text-field-linear',
    description: 'For example: Push-ups, Squats',
    type: 'number',
    unit: 'reps',
  },
};

export const useRecordField = () => {
  const [recordFieldList, setRecordFieldList] = useLocalStorage<
    Record<string, RecordField>
  >(RECORD_KEY, defaultRecordField);

  const getAllRecordFields = () => {
    return Object.values(recordFieldList);
  };

  const addRecordField = (checklistRecord: RecordField) => {
    setRecordFieldList(prev => ({
      ...prev,
      [checklistRecord.key]: checklistRecord,
    }));
  };

  const removeRecordField = (key: string) => {
    setRecordFieldList(prev => {
      const newChecklistRecord = { ...prev };
      delete newChecklistRecord[key];
      return newChecklistRecord;
    });
  };

  return {
    getAllRecordFields,
    getRecordFields: (ids: string[]) => {
      return ids.map(id => recordFieldList[id]);
    },
    addRecordField,
    removeRecordField,
  };
};
