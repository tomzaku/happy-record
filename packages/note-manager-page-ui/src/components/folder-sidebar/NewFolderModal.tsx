import React from 'react';
import SettingsDialog from '@dreamer/detail-task-page/src/components/SettingsDialog';
import Input from '@moon-ui/input';
import Button from '@moon-ui/button';

import styles from './NewFolderModal.module.scss';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onCreate: (title: string) => void;
};

/** The sidebar's own "+" popup — name it, submit, land on it (`onCreate` is
 * useNoteManagerState's own `createNoteFolder`, which already selects the new folder once it's
 * made). Built on `SettingsDialog` (detail-task-page's own shared modal shell — badge header,
 * proper body/footer padding, desktop `Modal`/mobile `BottomModal` split already handled by it)
 * rather than a bare `@moon-ui/modal` with hand-rolled content: that first pass looked visibly
 * off — `Input` with no `border` prop is the same color as the modal background in light mode
 * (`--input-background`/`--card-background` are both plain white — see @moon-ui/input's own
 * `.input`), and `Button`'s own `type="ghost"` has near-zero vertical padding
 * (`@moon-ui/button`'s own `.ghost`) unless a caller overrides it, which every real consumer of
 * SettingsDialog's own footer already does (see ChecklistFieldGroupAddGroup's own
 * `.secondaryButton`, mirrored below) — this just wasn't doing either yet. */
const NewFolderModal = ({ visible, onDismiss, onCreate }: Props) => {
  const [title, setTitle] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (visible) setTitle('');
  }, [visible]);

  // SettingsDialog only mounts its children while `visible` (Modal/BottomModal both `if
  // (!visible) return null`), so the input doesn't exist yet on the render that flips `visible`
  // true — a rAF gives the real DOM node a beat to land before focusing it.
  React.useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const submit = () => {
    if (!title.trim()) return;
    onCreate(title);
    onDismiss();
  };

  return (
    <SettingsDialog
      visible={visible}
      onDismiss={onDismiss}
      title="New Folder"
      icon="solar:folder-outline"
      footer={
        <>
          <Button type="ghost" className={styles.secondaryButton} onClick={onDismiss}>
            Cancel
          </Button>
          <Button className={styles.primaryButton} disabled={!title.trim()} onClick={submit}>
            Create
          </Button>
        </>
      }
    >
      <Input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Folder name"
        border="solid"
        onKeyDown={e => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onDismiss();
        }}
      />
    </SettingsDialog>
  );
};

export default NewFolderModal;
