import { useLocalStorage } from '../../hook/useLocalStorage';

const BABY_STORAGE_KEY = 'baby';

export const useBaby = () => {
  const [baby, setBaby] = useLocalStorage(BABY_STORAGE_KEY, {
    // dueDate: new Date(
    //   new Date().getTime() + 40 * 7 * 24 * 60 * 60 * 1000
    // ).toISOString(),
    // startDate: new Date().toISOString(),
  });
  const calculateStartDateFromDueDate = (dueDate: string) => {
    // Minus 280 days from due date
    const startDate = new Date(
      new Date(dueDate).getTime() - 280 * 24 * 60 * 60 * 1000
    ).toISOString();
    return startDate;
  };
  return {
    baby,
    setBaby,
    calculateStartDateFromDueDate,
  };
};
