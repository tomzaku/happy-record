import React from 'react';
import { useNoteFolder } from '@dreamer/global/src/store/note-folder';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { format } from 'date-fns';

export const NoteManagerPage: React.FC = () => {
  const {
    getAllNoteFolders,
    addNoteFolder,
    updateNoteFolder,
    deleteNoteFolder,
  } = useNoteFolder();
  const { getChecklistRecords, updateChecklistRecord } = useChecklistRecord();
  const { getAllRecordFields } = useRecordField();
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(
    null,
  );
  const [isAddingFolder, setIsAddingFolder] = React.useState(false);
  const [newFolderTitle, setNewFolderTitle] = React.useState('');

  const noteFields = getAllRecordFields().filter(
    field => field.type === 'note',
  );
  const noteFieldIds = noteFields.map(field => field.id);

  // Get all note records from all checklist templates
  const allNoteRecords = React.useMemo(() => {
    const records: Record<string, ChecklistRecord>[] = [];
    noteFields.forEach(field => {
      const fieldRecords = getChecklistRecords(field.id, {
        rangeDate: {
          from: new Date(0).toISOString(),
          to: new Date().toISOString(),
        },
        fieldIds: [field.id],
      });
      Object.values(fieldRecords).forEach(dayRecords => {
        records.push(...dayRecords);
      });
    });
    return records;
  }, [noteFields, getChecklistRecords]);

  const folders = getAllNoteFolders();
  const selectedFolder = selectedFolderId
    ? folders.find(f => f.id === selectedFolderId)
    : null;

  const handleAddFolder = () => {
    if (newFolderTitle.trim()) {
      addNoteFolder({ title: newFolderTitle.trim() });
      setNewFolderTitle('');
      setIsAddingFolder(false);
    }
  };

  console.log('ALL NOTE RECORDS', allNoteRecords);
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Note Manager</h1>
        <button
          onClick={() => setIsAddingFolder(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Folder
        </button>
      </div>

      {isAddingFolder && (
        <div className="mb-4 p-4 border rounded">
          <input
            type="text"
            value={newFolderTitle}
            onChange={e => setNewFolderTitle(e.target.value)}
            placeholder="Folder name"
            className="w-full p-2 border rounded mb-2"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAddingFolder(false);
                setNewFolderTitle('');
              }}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAddFolder}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Folders sidebar */}
        <div className="border rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Folders</h2>
          <div className="space-y-2">
            {folders.map(folder => (
              <div
                key={folder.id}
                className={`p-2 rounded cursor-pointer ${
                  selectedFolderId === folder.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <div className="flex justify-between items-center">
                  <span>{folder.title}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteNoteFolder(folder.id);
                      if (selectedFolderId === folder.id) {
                        setSelectedFolderId(null);
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes content */}
        <div className="md:col-span-2 border rounded p-4">
          <h2 className="text-lg font-semibold mb-4">
            {selectedFolder ? selectedFolder.title : 'All Notes'}
          </h2>
          <div className="space-y-4">
            {allNoteRecords
              .filter(
                record =>
                  !selectedFolder || record.folderId === selectedFolder.id,
              )
              .map(record => (
                <div key={record.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm text-gray-500">
                        {format(
                          new Date(record.createdAt),
                          'MMM d, yyyy h:mm a',
                        )}
                      </span>
                    </div>
                    <select
                      value={record.folderId || ''}
                      onChange={e => {
                        const folderId = e.target.value || undefined;
                        updateChecklistRecord(record.id, {
                          value: record.value,
                          checklistTemplateId: record.checklistTemplateId,
                          folderId,
                        });
                      }}
                      className="border rounded p-1"
                    >
                      <option value="">No Folder</option>
                      {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>
                          {folder.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="whitespace-pre-wrap">{record.value}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
