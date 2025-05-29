import React from 'react';
import useLocalStorage from './useLocalStorage';

function LocalStorageEditor() {
  const { storedValue, setStoredValue, save } = useLocalStorage(
    'checklist_template',
    '',
  );

  const handleChange = e => {
    setStoredValue(e.target.value);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>LocalStorage Editor</h2>
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
      <button onClick={save}>Save</button>
    </div>
  );
}

export default LocalStorageEditor;
