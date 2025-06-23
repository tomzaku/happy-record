import {
  getFirestore,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { useLocalStorage } from './useLocalStorage';
import { v4 } from 'uuid';
import { useUser } from './useUser';

const firebaseConfig = {
  apiKey: 'AIzaSyA5y2kRmE3UvUJfD5sNo8Ww5hdjSwF6VRY',
  authDomain: 'dreamer-f595f.firebaseapp.com',
  projectId: 'dreamer-f595f',
  storageBucket: 'dreamer-f595f.firebasestorage.app',
  messagingSenderId: '363304767907',
  appId: '1:363304767907:web:734ebd9ea0bc436410ca16',
  measurementId: 'G-B9GDH81EEC',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app, '(default)');

export const useStorageSync = () => {
  const { user } = useUser();

  const syncToCloud = async () => {
    const all = Object.keys(localStorage).reduce(
      (obj, k) => ({ ...obj, [k]: localStorage.getItem(k) }),
      {},
    );

    const localStorageColRef = collection(db, 'localStorage');

    // 1. Query for existing document
    const q = query(localStorageColRef, where('userId', '==', user.id));
    const querySnapshot = await getDocs(q);

    // 2. Update existing doc or create new if none exists
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        content: JSON.stringify(all),
        lastUpdated: new Date().toISOString(),
      });
      return docRef.id;
    } else {
      const newDocRef = await addDoc(localStorageColRef, {
        content: JSON.stringify(all),
        userId: user.id,
        created: new Date().toISOString(),
      });
      alert('DONE');
      return newDocRef.id;
    }
  };

  const syncFromCloud = async () => {
    const localStorageCol = collection(db, 'localStorage');
    const q = query(localStorageCol, where('userId', '==', user.id));
    const localStorageSnapshot = await getDocs(q);
    const localStorageList = localStorageSnapshot.docs.map(doc => doc.data());
    console.log('>LOCALSTORAGE', localStorageList);
    return localStorageList[0].content;
  };
  return { syncToCloud, syncFromCloud };
};
