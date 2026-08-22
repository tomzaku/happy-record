import React from 'react';
import { useLocalStorageAll } from './useLocalStorage';
import { useUser } from '@dreamer/global/src/hook/useUser';
import Typography from '@moon-ui/typography';
import NoteEditor from '@moon-ui/note-editor';

function LocalStorageEditor() {
  const [storedValue, setStoredValue] = React.useState<string>('{}');
  const { storage, setAll } = useLocalStorageAll({
    onStorageChange: data => setStoredValue(JSON.stringify(data)),
  });
  const handleChange = e => {
    setStoredValue(e.target.value);
  };
  const { user, setUser } = useUser();
  const [userId, setUserId] = React.useState(user.id);

  return (
    <div style={{ padding: '20px', margin: '0 auto' }}>
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
      <input value={userId} onChange={e => setUserId(e.target.value)} />
      <button
        onClick={() => {
          setUser({
            ...user,
            id: userId,
          });
        }}
      >
        update user id
      </button>
      <button onClick={() => setAll(JSON.parse(storedValue))}>
        UPDATE LOCAL STORAGE LOCAL
      </button>
      <NoteEditor />
    </div>
  );
}

export default LocalStorageEditor;
