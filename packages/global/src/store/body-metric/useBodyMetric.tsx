import React from 'react';
import { create } from 'zustand';
import { useLocalStorage } from '../../hook';
import { v4 } from 'uuid';

type BodyMetric = {
  id: string;
  weight: number;
  bellySize: number;
  createdAt: string;
};

const BODY_METRIC_KEY = 'body_metric';

type ChartData = {
  chartData: any;
  setChartData: (newChartData: any) => void;
};
const useChartDataStore = create<ChartData>(set => ({
  chartData: {},
  setChartData: (newChartData: any) => set({ chartData: newChartData }),
}));

type CurrentBodyMetric = {
  currentBodyMetric?: BodyMetric;
  setCurrentBodyMetric: (newCurrentBodyMetric?: BodyMetric) => void;
  currentDay: Date;
  setCurrentDay: (newCurrentDay: Date) => void;
};
const useCurrentBodyMetric = create<CurrentBodyMetric>(set => ({
  currentDay: new Date(),
  setCurrentDay: (newCurrentDay: Date) => set({ currentDay: newCurrentDay }),
  currentBodyMetric: undefined,
  setCurrentBodyMetric: (newCurrentBodyMetric?: BodyMetric) =>
    set({ currentBodyMetric: newCurrentBodyMetric }),
}));

export const useBodyMetric = () => {
  const [bodyMetric, setBodyMetric] = useLocalStorage<
    Record<string, BodyMetric>
  >(BODY_METRIC_KEY, {});
  const { chartData, setChartData } = useChartDataStore();
  const { currentBodyMetric, setCurrentBodyMetric, currentDay, setCurrentDay } =
    useCurrentBodyMetric();
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
  const addBodyMetric = (currentBodyMetric: Omit<BodyMetric, 'id'>) => {
    const foundSameDayBodyMetric = Object.values(bodyMetric).find(
      bodyMetric =>
        new Date(bodyMetric.createdAt).toLocaleDateString() ===
        new Date(currentBodyMetric.createdAt).toLocaleDateString()
    );
    let newBodyMetric;
    let id = foundSameDayBodyMetric?.id || '';
    if (foundSameDayBodyMetric) {
      newBodyMetric = {
        ...bodyMetric,
        [foundSameDayBodyMetric.id]: {
          ...foundSameDayBodyMetric,
          ...currentBodyMetric,
        },
      };
    } else {
      id = v4();
      newBodyMetric = {
        ...bodyMetric,
        [id]: {
          ...currentBodyMetric,
          id,
        },
      };
    }

    setBodyMetric(newBodyMetric);
    updateChartDate(newBodyMetric);
    setCurrentBodyMetric(newBodyMetric[id]);
  };

  // const updateCurrentBodyMetric = ({
  //   newBodyMetric,
  // }: {
  //   newBodyMetric: Record<string, BodyMetric>;
  // }) => {
  //   const newCurrentBodyMetric = Object.values(newBodyMetric).find(
  //     bodyMetric => {
  //       return (
  //         new Date(bodyMetric.createdAt).toLocaleDateString() ===
  //         new Date().toLocaleDateString()
  //       );
  //     }
  //   );
  //   setCurrentBodyMetric(newCurrentBodyMetric);
  // };

  const updateCurrentBodyMetric = ({ date }: { date: Date }) => {
    const foundSameDayBodyMetric = Object.values(bodyMetric).find(
      bodyMetric =>
        new Date(bodyMetric.createdAt).toLocaleDateString() ===
        date.toLocaleDateString()
    );
    setCurrentBodyMetric(foundSameDayBodyMetric);
    setCurrentDay(date);
    return foundSameDayBodyMetric;
  };

  React.useEffect(() => {
    updateCurrentBodyMetric({ date: new Date() });
  }, []);

  return {
    addBodyMetric,
    getChartData,
    chartData,
    updateChartDate,
    setChartData,
    currentBodyMetric,
    updateCurrentBodyMetric,
    currentDay,
  };
};
