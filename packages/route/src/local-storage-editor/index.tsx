import React from 'react';
import { useLocalStorageAll } from './useLocalStorage';
import { useStorageSync } from '@dreamer/global/src/hook/useStorageSync';
import { useUser } from '@dreamer/global/src/hook/useUser';
import Typography from '@moon-ui/typography';

function LocalStorageEditor() {
  const { syncToCloud, syncFromCloud } = useStorageSync();

  const [storedValue, setStoredValue] = React.useState<string>('{}');
  const { storage, setAll } = useLocalStorageAll({
    onStorageChange: data => setStoredValue(JSON.stringify(data)),
  });
  const handleChange = e => {
    setStoredValue(e.target.value);
  };
  const { user } = useUser();

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <Typography.Text>{user.id}</Typography.Text>
      <textarea
        value={storedValue}
        onChange={handleChange}
        placeholder="Start typing here..."
        style={{
          width: '100%',
          height: '300px',
          padding: '10px',
          fontSize: '16px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          resize: 'vertical',
        }}
      />
      <button onClick={() => setAll(JSON.parse(storedValue))}>
        UPDATE LOCAL STORAGE LOCAL
      </button>
      <button onClick={syncToCloud}>Sync(Upload to server)</button>
      <button onClick={syncFromCloud}>FETCH(Download)</button>
    </div>
  );
}

export default LocalStorageEditor;
