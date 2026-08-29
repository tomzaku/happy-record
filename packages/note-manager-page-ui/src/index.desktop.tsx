import { DesktopDrawer } from '@dreamer/header';
import styles from './index.desktop.module.scss';
import FolderSidebar from './components/folder-sidebar';
import NoteList from './components/note-list';
import NoteEditorPane from './components/note-editor-pane';
import { useNoteManagerState } from './useNoteManagerState';

export const NoteManagerPageDesktop = () => {
  const {
    allNoteFields,
    fieldMap,
    templateMap,
    taskFolders,
    noteFolders,
    hasOtherNotes,
    emptyFields,
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
    composing,
    selectFolder,
    selectNote,
    selectField,
    startCompose,
    chooseComposeField,
    cancelCompose,
    createNoteFolder,
    updateSelectedNoteValue,
    updateSelectedNoteTitle,
    updateSelectedNoteFolder,
    deleteNote,
  } = useNoteManagerState();

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={styles.desktopBody}>
        {/* Each pane gets its own sizing wrapper here rather than a `className` merged into the
            component's own root class — the component's own root already needs `height: 100%`
            for its internal scroll area to work when reused standalone (the mobile Folders
            drawer, for FolderSidebar), and stacking a second, differently-sourced class for
            desktop's fixed/flexible widths on that same element left the two fighting over which
            one's `flex`/`width` rules actually apply. A wrapper sidesteps that entirely. */}
        <div className={styles.sidebarPane}>
          <FolderSidebar
            noteFields={allNoteFields}
            noteFolders={noteFolders}
            taskFolders={taskFolders}
            hasOtherNotes={hasOtherNotes}
            selectedFolder={selectedFolder}
            totalNoteCount={totalNoteCount}
            onSelectFolder={selectFolder}
            onCreateFolder={createNoteFolder}
          />
        </div>
        <div className={styles.listPane}>
          <NoteList
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
            selectedNoteId={selectedNote?.id}
            onSelectNote={selectNote}
            onNewNote={startCompose}
            canCreateNote={emptyFields.length > 0}
          />
        </div>
        <div className={styles.editorPane}>
          <NoteEditorPane
            note={selectedNote}
            loading={selectedNoteLoading}
            fieldMenu={selectedFieldCluster}
            onSelectNote={selectNote}
            sourceLabel={selectedNoteSourceLabel}
            sourceHref={selectedNoteSourceHref}
            noteFolders={noteFolders}
            onChangeFolder={updateSelectedNoteFolder}
            composing={composing}
            emptyFields={emptyFields}
            onChooseComposeField={chooseComposeField}
            onCancelCompose={cancelCompose}
            onChangeTitle={updateSelectedNoteTitle}
            onChangeValue={updateSelectedNoteValue}
            onDelete={deleteNote}
          />
        </div>
      </div>
    </div>
  );
};
