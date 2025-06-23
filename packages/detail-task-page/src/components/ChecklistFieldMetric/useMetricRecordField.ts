import React from 'react';

import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInDays,
} from 'date-fns';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const getCurrentStreak = (dates: string[]) => {
  let currentStreak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (
      dates[i + 1] === undefined ||
      differenceInDays(dates[i + 1], dates[i]) === 1
    ) {
      currentStreak++;
    } else {
      return currentStreak;
    }
  }
  return currentStreak;
};

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
  const [total, setTotal] = React.useState(0);
  const [currentStreak, setCurrentStreak] = React.useState(0);
  const fetchChecklistRecords = (rangeDateType: 'month' | 'year') => {
    const metricFieldIds = fields
      .filter(field => field.type === 'metric')
      .map(field => field.id);
    if (metricFieldIds.length === 0) {
      return;
    }
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate:
        rangeDateType === 'month'
          ? {
              from: startOfMonth(new Date()).toISOString(),
              to: endOfMonth(new Date()).toISOString(),
            }
          : {
              from: startOfYear(new Date()).toISOString(),
              to: endOfYear(new Date()).toISOString(),
            },
      sortBy: 'createdAt',
      fieldIds: metricFieldIds,
    });
    const categories = Object.keys(records);
    setCurrentStreak(getCurrentStreak(categories));
    const values = Object.values(records);
    setTotal(values.flat().reduce((acc, i) => acc + i.value, 0));
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
  };
  React.useEffect(() => {
    fetchChecklistRecords('month');
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
    currentStreak,
    total,
    fetchChecklistRecords,
  };
};
