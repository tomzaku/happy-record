import { useLocalStorage } from '../../hook';

const CHECKLIST_RECORD_KEY = 'checklist_record';

type ChecklistRecord = {
  checklistId: string;
  checklistTemplateId: string;
  date: string;
  fieldId: string;
  value: number;
};

// Since we store in FE we might need nest the data to queries faster
type ChecklistRecorStore = {
  [checklistTemplateId: string]: ChecklistRecord[];
};

type AddChecklistRecordData = {
  records: {
    fieldId: string;
    value: number;
  }[];
  checklistId: string;
  checklistTemplateId: string;
  date: string;
};

export const useChecklistRecord = () => {
  const [checklistRecordList, setChecklistRecordList] =
    useLocalStorage<ChecklistRecorStore>(CHECKLIST_RECORD_KEY, {});

  // const addChecklistRecordCore = (checklistRecord: ChecklistRecord) => {
  // 	setChecklistRecordList(prev => ({
  // 		...prev,
  // 		[checklistRecord.checklistTemplateId]: [
  // 			...(prev[checklistRecord.checklistTemplateId] || []),
  // 			checklistRecord,
  // 		],
  // 	}));
  // };
  const addChecklistRecord = (data: AddChecklistRecordData) => {
    console.log('addChecklistRecord');
    if (data.records.length) {
      setChecklistRecordList(prev => ({
        ...prev,
        [data.checklistTemplateId]: [
          ...(prev[data.checklistTemplateId] || []),
          ...data.records.map(record => ({
            ...record,
            checklistId: data.checklistId,
            checklistTemplateId: data.checklistTemplateId,
            date: data.date,
          })),
        ],
      }));
    }
  };
  const getChecklistRecords = (checklistTemplateId: string) => {
    return checklistRecordList[checklistTemplateId] || [];
  };
  console.log('>HOOK?');
  return {
    addChecklistRecord,
    getChecklistRecords,
  };
};
