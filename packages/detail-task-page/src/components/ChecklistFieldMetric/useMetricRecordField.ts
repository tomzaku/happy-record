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
  format,
} from 'date-fns';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';

// A record's `value` can be null/undefined/non-numeric (old bad submissions,
// or a mismatched field type) — skip those rather than let one `NaN` (via
// `+`) poison the whole running sum/total/today-count below. See
// ChecklistFieldGroupAdd's identical helper for the same reason.
const toFiniteNumber = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const sum = (arr: unknown[]) =>
  arr.reduce<number>((a, b) => a + (toFiniteNumber(b) ?? 0), 0);

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
  const [todayCount, setTodayCount] = React.useState(0);
  const [peak, setPeak] = React.useState(0);
  // Tracks whichever range the caller last asked for (see ChecklistFieldMetric/
  // index.tsx's month/year toggle) so the effect below can re-request the
  // same range on a store update, without a state dependency that would
  // re-trigger itself every time `fetchChecklistRecords` runs.
  const rangeTypeRef = React.useRef<'month' | 'year'>('month');
  const fetchChecklistRecords = (rangeDateType: 'month' | 'year') => {
    rangeTypeRef.current = rangeDateType;
    const numberFieldIds = fields
      .filter(field => field.type === 'number')
      .map(field => field.id);
    if (numberFieldIds.length === 0) {
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
      fieldIds: numberFieldIds,
    });
    const categories = Object.keys(records);
    setCurrentStreak(getCurrentStreak(categories));
    const values = Object.values(records);
    setTotal(sum(values.flat().map(i => i.value)));
    const today = format(new Date(), 'yyyy-MM-dd');
    const recordToday = records[today];
    if (recordToday?.length > 0) {
      setTodayCount(sum(recordToday.map(i => i.value)));
    }
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
      }
    }, {});
    if(Object.values(seriesValues).flat().length > 0) {
      setPeak(Math.max(...Object.values(seriesValues).flat()));
    }  
    setData({
      categories,
      seriesValues,
    });
  };
  // Was `useEffect(..., [])` — fired once ever, so a record submitted on
  // another device (or the field list itself changing) never refreshed this
  // chart. `getChecklistRecords` is a plain closure today (new identity
  // every render until it's `useCallback`-wrapped), so this still refires
  // on every render — correct, just not free.
  React.useEffect(() => {
    fetchChecklistRecords(rangeTypeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistTemplateId, fields, getChecklistRecords]);

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
    todayCount,
    peak,
  };
};
