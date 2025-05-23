import React from 'react';

import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { useChecklistTemplates } from '@dreamer/global';
import { startOfMonth, endOfMonth } from 'date-fns';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export const useMetricRecordField = ({
  checklistTemplateId,
}: {
  checklistTemplateId: string;
}) => {
  const { getRecordFields } = useRecordField();
  const { getChecklistRecords } = useChecklistRecord();
  const [currentRecordFields, setCurrentRecordFields] = React.useState<
    RecordField[]
  >([]);
  const { getChecklistTemplate } = useChecklistTemplates();

  const [data, setData] = React.useState({});
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(checklistTemplateId);
    const currentRecordFields = getRecordFields(checklistTemplate?.records);
    setCurrentRecordFields(currentRecordFields);
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: startOfMonth(new Date()).toISOString(),
        to: endOfMonth(new Date()).toISOString(),
      },
    });
    console.log('RECORDS from metric', records);
    const categories = Object.keys(records);
    const values = Object.values(records);
    const seriesValues = currentRecordFields.reduce(
      (acc, recordField, index) => {
        const seriesValue = values.map(value => {
          const result = value
            .filter(record => record.fieldId === recordField.id)
            .map(record => record.value);
          return sum(result);
        });
        return {
          ...acc,
          [recordField.id]: seriesValue,
        };
      },
      {},
    );
    setData({
      categories,
      seriesValues,
    });
  }, []);

  const series = currentRecordFields.map(recordField => {
    return {
      name: recordField.title,
      data: data.seriesValues[recordField.id],
    };
  });
  const options = {
    // stroke: {
    // 	curve: 'smooth',
    // },
    // fill: {
    // 	type: 'gradient',
    // },
    xaxis: {
      categories: data.categories,
    },
  };

  return {
    series,
    options,
  };
};
