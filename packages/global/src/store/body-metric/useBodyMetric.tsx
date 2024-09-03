import React from 'react';
import { useLocalStorage } from '../../hook';
import { v4 } from 'uuid';

type BodyMetric = {
  id: string;
  weight: number;
  bellySize: number;
  createdAt: string;
};

const BODY_METRIC_KEY = 'body_metric';

export const useBodyMetric = () => {
  const [bodyMetric, setBodyMetric] = useLocalStorage<
    Record<string, BodyMetric>
  >(BODY_METRIC_KEY, {});
  // const [chartData, setChartData] = useLocalStorage<any>('CHART_DATA_KEY', {});
  const [chartData, setChartData] = React.useState<any>({});

  const getChartData = (newBodyMetric = bodyMetric) => {
    const sortedByDateData = Object.values(newBodyMetric).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // return day and month
    const categories = sortedByDateData.map(bodyMetric => {
      return new Date(bodyMetric.createdAt).toLocaleDateString();
    });
    const weights = sortedByDateData.map(bodyMetric => {
      return bodyMetric.weight;
    });
    const bellySizes = sortedByDateData.map(bodyMetric => {
      return bodyMetric.bellySize;
    });
    return {
      categories,
      weights,
      bellySizes,
    };
  };
  const updateChartDate = (newBodyMetric?: any) => {
    const newChartData = getChartData(newBodyMetric);
    setChartData(newChartData);
  };
  const addBodyMetric = (
    currentBodyMetric: Omit<BodyMetric, 'id' | 'createdAt'>
  ) => {
    const foundSameDayBodyMetric = Object.values(bodyMetric).find(
      bodyMetric =>
        new Date(bodyMetric.createdAt).toLocaleDateString() ===
        new Date().toLocaleDateString()
    );
    let newBodyMetric;
    if (foundSameDayBodyMetric) {
      newBodyMetric = {
        ...bodyMetric,
        [foundSameDayBodyMetric.id]: {
          ...foundSameDayBodyMetric,
          ...currentBodyMetric,
          createdAt: new Date().toISOString(),
        },
      };
    } else {
      const id = v4();
      newBodyMetric = {
        ...bodyMetric,
        [id]: {
          ...currentBodyMetric,
          id,
          createdAt: new Date().toISOString(),
        },
      };
    }

    setBodyMetric(newBodyMetric);
    updateChartDate(newBodyMetric);
  };

  const getMetricToday = () => {
    return Object.values(bodyMetric).find(bodyMetric => {
      return (
        new Date(bodyMetric.createdAt).toLocaleDateString() ===
        new Date().toLocaleDateString()
      );
    });
  };

  return {
    addBodyMetric,
    getMetricToday,
    getChartData,
    chartData,
    updateChartDate,
    setChartData,
  };
};
