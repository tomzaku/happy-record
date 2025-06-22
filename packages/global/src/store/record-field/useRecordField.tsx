import { useLocalStorage } from '../../hook';
import { v4 } from 'uuid';

const RECORD_KEY = 'record_field';

export type RecordField = {
  id: string;
  title: string;
  icon: string;
  description: string;
  type: 'metric' | 'note';
  unit: string;
};

const defaultRecordField: Record<string, RecordField> = {
  duration: {
    id: 'duration',
    title: 'Duration',
    icon: 'solar:clock-square-broken',
    description: 'Record duration for tracking purpose',
    type: 'metric',
    unit: 'minutes',
  },
  'push-ups': {
    id: 'push-ups',
    title: 'Push-ups',
    icon: 'iconoir:gym',
    description: 'For example: Push-ups, Squats',
    type: 'metric',
    unit: 'reps',
  },
  note: {
    id: 'note',
    title: 'Note',
    icon: 'solar:notebook-minimalistic-linear',
    description: 'Note for tracking purpose',
    type: 'note',
    unit: 'words',
  },
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const useRecordField = () => {
  const [recordFieldList, setRecordFieldList] = useLocalStorage<
    Record<string, RecordField>
  >(RECORD_KEY, defaultRecordField);

  const getAllRecordFields = () => {
    return Object.values(recordFieldList);
  };

  const addRecordField = (
    checklistRecord: PartialBy<RecordField, 'id'>,
    keepId = false,
  ) => {
    const newId = keepId && checklistRecord.id ? checklistRecord.id : v4();
    setRecordFieldList(prev => ({
      ...prev,
      [newId]: {
        id: newId,
        ...checklistRecord,
      },
    }));
    return {
      id: newId,
      ...checklistRecord,
    };
  };

  const removeRecordField = (id: string) => {
    setRecordFieldList(prev => {
      const newChecklistRecord = { ...prev };
      delete newChecklistRecord[id];
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
