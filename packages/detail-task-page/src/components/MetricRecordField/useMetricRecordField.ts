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

// A record's `value` can be null/undefined/non-numeric (old bad submissions,
// or a mismatched field type) — skip those rather than let one `NaN` (via
// `+`) poison the whole running sum. See ChecklistFieldGroupAdd's identical
// helper for the same reason.
const toFiniteNumber = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const sum = (arr: unknown[]) =>
  arr.reduce<number>((a, b) => a + (toFiniteNumber(b) ?? 0), 0);

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
