import { v4 } from 'uuid';
import { useLocalStorage } from './useLocalStorage';

export const useUser = () => {
  const [user, setUser] = useLocalStorage(
    'user',
    { id: v4() },
    { storeOnMount: true },
  );
  return {
    user,
    setUser,
  };
};
