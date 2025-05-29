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
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export const useMetricRecordField = ({
  checklistTemplateId,
  fields,
}: {
  checklistTemplateId: string;
  fields: RecordField[];
}) => {
  const { theme } = usePomodoroGlobalConfig();
  const { getChecklistRecords } = useChecklistRecord();

  const [data, setData] = React.useState({});
  React.useEffect(() => {
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: startOfMonth(new Date()).toISOString(),
        to: endOfMonth(new Date()).toISOString(),
      },
      sortBy: 'createdAt',
      fieldIds: fields
        .filter(field => field.type === 'metric')
        .map(field => field.id),
    });
    const categories = Object.keys(records);
    const values = Object.values(records);
    const seriesValues = fields.reduce((acc, recordField, index) => {
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
    }, {});
    setData({
      categories,
      seriesValues,
    });
  }, []);

  const series = fields.map(recordField => {
    return {
      name: recordField.title,
      data: data?.seriesValues?.[recordField.id],
    };
  });
  const options = {
    ...(theme === Theme.Dark
      ? {
          theme: {
            mode: 'dark',
          },
          chart: {
            background: '#162033',
          },
        }
      : {}),
    xaxis: {
      categories: data.categories,
    },
  };

  return {
    series,
    options,
  };
};
