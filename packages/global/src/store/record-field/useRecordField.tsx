import { useLocalStorage } from '../../hook';

const RECORD_KEY = 'record-field';

export type RecordField = {
  id: string;
  key: string; // search
  title: string;
  icon: string;
  description: string;
  type: 'metric' | 'note';
  unit: string;
};

const defaultRecordField = {
  duration: {
    id: 'duration',
    key: 'duration',
    title: 'Duration',
    icon: 'solar:clock-square-broken',
    description: 'Record duration for tracking purpose',
    type: 'metric',
    unit: 'minutes',
  },
  'push-ups': {
    id: 'push-ups',
    key: 'push-ups',
    title: 'Push-ups',
    icon: 'iconoir:gym',
    description: 'For example: Push-ups, Squats',
    type: 'metric',
    unit: 'reps',
  },
  note: {
    id: 'note',
    key: 'note',
    title: 'Note',
    icon: 'solar:notebook-minimalistic-linear',
    description: 'Note for tracking purpose',
    type: 'note',
    unit: 'words',
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
