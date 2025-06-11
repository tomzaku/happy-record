import Card from '@moon-ui/card';
import Icon from '@moon-ui/icon/Icon';

import { useNoteRecords } from '../../useNoteRecords';
import { useSearchParams } from 'react-router-dom';

import cx from 'classnames';
import styles from './index.module.scss';

type Props = {
  onChangeField?: (fieldIds: string[]) => void;
};

const NoteGroup = ({ onChangeField }: Props) => {
  const { allNoteFields } = useNoteRecords();
  const [search, setSearch] = useSearchParams();
  const fieldId = search.get('fieldId');
  return (
    <Card className={styles.container}>
      <div className={styles.tabContainer}>
        <div className={styles.tabItem}>Fields</div>
        <div className={styles.tabItem}>Tags</div>
      </div>
      <div
        onClick={() => {
          const newSearch = Object.fromEntries(search);
          delete newSearch.fieldId;
          setSearch(newSearch);
          onChangeField?.(allNoteFields.map(f => f.id));
        }}
        className={cx(styles.item, !fieldId && styles.itemActive)}
      >
        <Icon
          icon={'solar:notes-line-duotone'}
          className={cx(styles.icon, !fieldId && styles.iconActive)}
        />
        All Notes
      </div>
      {allNoteFields.map(f => {
        return (
          <div
            onClick={() => {
              setSearch({
                ...Object.fromEntries(search),
                fieldId: f.id,
              });
              onChangeField?.([f.id]);
            }}
            className={cx(styles.item, fieldId === f.id && styles.itemActive)}
          >
            <Icon
              icon={f.icon}
              className={cx(styles.icon, fieldId === f.id && styles.iconActive)}
            />
            {f.title}
          </div>
        );
      })}
    </Card>
  );
};

export default NoteGroup;
