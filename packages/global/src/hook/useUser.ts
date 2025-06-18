import { v4 } from 'uuid';
import { useLocalStorage } from './useLocalStorage';

export const useUser = () => {
  const [user] = useLocalStorage('user', { id: v4() }, { storeOnMount: true });
  return {
    user,
  };
};
