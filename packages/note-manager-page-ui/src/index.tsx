import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BackHeader } from '@dreamer/header';
import Icon from '@moon-ui/icon/Icon';
import Drawer from '@moon-ui/drawer';

import FolderSidebar from './components/folder-sidebar';
import NoteList from './components/note-list';
import NoteEditorPane from './components/note-editor-pane';
import { useNoteManagerState } from './useNoteManagerState';
import styles from './index.module.scss';

/**
 * Mobile: a list-then-detail drill-down over the same state index.desktop.tsx renders as three
 * panes side by side — tapping a note (or starting a new one) swaps the whole screen to
 * NoteEditorPane with its own back button, rather than showing all three at once. Folders live
 * behind a full-screen picker (@moon-ui/drawer) instead of a permanent sidebar column there
 * isn't room for.
 */
export const NoteManagerPage = () => {
  const navigate = useNavigate();
  const [foldersOpen, setFoldersOpen] = React.useState(false);
  const {
    allNoteFields,
    fieldMap,
    templateMap,
    taskFolders,
    noteFolders,
    hasOtherNotes,
    hasUnfiledNotes,
    notes,
    notesLoading,
    groupByField,
    taskFieldGroupNotes,
    taskFieldClusters,
    totalNoteCount,
    selectedFolder,
    selectedFolderTitle,
    selectedNote,
    selectedNoteLoading,
    selectedNoteSourceLabel,
    selectedNoteSourceHref,
    selectedFieldId,
    selectedFieldCluster,
    selectFolder,
    selectNote,
    selectField,
    closeNote,
    createQuickNote,
    createNoteFolder,
    updateSelectedNoteValue,
    updateSelectedNoteTitle,
    updateSelectedNoteFolder,
    deleteNote,
  } = useNoteManagerState();

  const showDetail = !!selectedNote || !!selectedFieldId;

  if (showDetail) {
    return (
      <div className={styles.screen}>
        <BackHeader
          renderLeftComponent={() => <>{selectedNote?.title || selectedFieldCluster?.title || 'Note'}</>}
          onClickLeftButton={closeNote}
        />
        <NoteEditorPane
          className={styles.detailPane}
          note={selectedNote}
          loading={selectedNoteLoading}
          fieldMenu={selectedFieldCluster}
          onSelectNote={selectNote}
          sourceLabel={selectedNoteSourceLabel}
          sourceHref={selectedNoteSourceHref}
          noteFolders={noteFolders}
          onChangeFolder={updateSelectedNoteFolder}
          onChangeTitle={updateSelectedNoteTitle}
          onChangeValue={updateSelectedNoteValue}
          onDelete={note => {
            deleteNote(note);
            closeNote();
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <BackHeader
        renderLeftComponent={() => <>Notes</>}
        onClickLeftButton={() => navigate('/')}
        renderRightComponent={() => (
          <button
            type="button"
            className={styles.headerIconButton}
            onClick={() => setFoldersOpen(true)}
            aria-label="Folders"
          >
            <Icon icon="solar:folder-outline" width={20} />
          </button>
        )}
      />
      <NoteList
        className={styles.listPane}
        title={selectedFolderTitle}
        notes={notes}
        loading={notesLoading}
        groupByField={groupByField}
        fieldGroupNotes={taskFieldGroupNotes}
        fieldClusters={taskFieldClusters}
        selectedFieldId={selectedFieldId ?? undefined}
        onSelectField={selectField}
        fieldMap={fieldMap}
        templateMap={templateMap}
        onSelectNote={selectNote}
        onNewNote={createQuickNote}
      />
      {/* Full-screen, not a compact bottom sheet — @moon-ui/drawer's own sliding panel always
          fills the viewport (see its own index.module.scss), so this gets a real header/close
          button instead of relying on a tap-outside-to-dismiss backdrop that wouldn't be
          visible anyway. */}
      <Drawer visible={foldersOpen} onBlur={() => setFoldersOpen(false)}>
        <BackHeader
          renderLeftComponent={() => <>Folders</>}
          onClickLeftButton={() => setFoldersOpen(false)}
        />
        <FolderSidebar
          noteFields={allNoteFields}
          noteFolders={noteFolders}
          taskFolders={taskFolders}
          hasOtherNotes={hasOtherNotes}
          hasUnfiledNotes={hasUnfiledNotes}
          selectedFolder={selectedFolder}
          totalNoteCount={totalNoteCount}
          onSelectFolder={folder => {
            selectFolder(folder);
            setFoldersOpen(false);
          }}
          onCreateFolder={createNoteFolder}
        />
      </Drawer>
    </div>
  );
};
