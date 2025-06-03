import { v4 } from 'uuid';
import { format } from 'date-fns';
import { useLocalStorage } from '../../hook';

const CHECKLIST_RECORD_KEY = 'checklist_record';

export type ChecklistRecord = {
  id: string;
  checklistId: string;
  checklistTemplateId: string;
  createdAt: string;
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
  createdAt: string;
};

export const useChecklistRecord = () => {
  const [checklistRecordList, setChecklistRecordList] =
    useLocalStorage<ChecklistRecorStore>(CHECKLIST_RECORD_KEY, {});

  const addChecklistRecord = (data: AddChecklistRecordData) => {
    if (data.records.length) {
      setChecklistRecordList(prev => ({
        ...prev,
        [data.checklistTemplateId]: [
          ...(prev[data.checklistTemplateId] || []),
          ...data.records.map(record => ({
            id: v4(),
            ...record,
            checklistId: data.checklistId,
            checklistTemplateId: data.checklistTemplateId,
            createdAt: data.createdAt,
          })),
        ],
      }));
    }
  };
  const getChecklistRecords = (
    checklistTemplateId: string,
    {
      rangeDate,
      type = 'date',
      fieldIds,
      sortBy,
      sortDirection = 'asc',
    }: {
      rangeDate: { from: string; to: string };
      type?: 'date' | 'time';
      fieldIds?: string[];
      sortBy?: 'createdAt';
      sortDirection?: 'asc' | 'desc';
    },
  ) => {
    const records = checklistRecordList[checklistTemplateId] || [];
    let filteredRecords = records;
    if (rangeDate) {
      filteredRecords = records.filter(record => {
        const recordDate = new Date(record.createdAt);
        return (
          recordDate >= new Date(rangeDate.from) &&
          recordDate <= new Date(rangeDate.to)
        );
      });
    }

    if (fieldIds && fieldIds.length) {
      filteredRecords = filteredRecords.filter(record =>
        fieldIds.includes(record.fieldId),
      );
    }

    // Sorting
    if (sortBy) {
      switch (sortBy) {
        case 'createdAt': {
          filteredRecords = filteredRecords.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
          });
          break;
        }
      }
    }
    if (sortDirection === 'desc') {
      filteredRecords = filteredRecords.reverse();
    }

    // Group records by day (YYYY-MM-DD format)
    const groupsByDay = filteredRecords.reduce<
      Record<string, ChecklistRecord[]>
    >((acc, record) => {
      const date = new Date(record.createdAt);
      // Extract only the date part (YYYY-MM-DD) from the ISO string
      const dayKey =
        type === 'date' ? format(date, 'yyyy-MM-dd') : date.toISOString();
      // Initialize array for this day if it doesn't exist
      if (!acc[dayKey]) {
        acc[dayKey] = [];
      }
      // Add the record to the corresponding day
      acc[dayKey].push(record);
      return acc;
    }, {});

    return groupsByDay;
  };

  const updateChecklistRecord = (
    recordId: string,
    {
      value,
      checklistTemplateId,
    }: {
      value: unknown;
      checklistTemplateId: string;
    },
  ) => {
    setChecklistRecordList(prev => {
      // Get the existing records for the given checklistTemplateId
      const existingRecords = prev[checklistTemplateId] || [];

      // Update the record with the matching id
      const updatedRecords = existingRecords.map(record => {
        if (record.id === recordId) {
          // Find the corresponding new data for this record's fieldId if provided
          return {
            ...record,
            value,
          };
        }
        return record;
      });

      return {
        ...prev,
        [checklistTemplateId]: updatedRecords,
      };
    });
  };

  return {
    addChecklistRecord,
    getChecklistRecords,
    updateChecklistRecord,
    deleteChecklistRecord: (
      recordId: string,
      { checklistTemplateId }: { checklistTemplateId: string },
    ) => {
      setChecklistRecordList(prev => {
        const existingRecords = prev[checklistTemplateId] || [];
        const updatedRecords = existingRecords.filter(
          record => record.id !== recordId,
        );
        return {
          ...prev,
          [checklistTemplateId]: updatedRecords,
        };
      });
    },
  };
};
