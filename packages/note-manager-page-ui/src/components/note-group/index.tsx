import React from 'react';
import Card from '@moon-ui/card';
import Icon from '@moon-ui/icon/Icon';

import { useNoteRecords } from '../../useNoteRecords';
import { useSearchParams } from 'react-router-dom';

import cx from 'classnames';
import styles from './index.module.scss';
import Typography from '@moon-ui/typography';

type Props = {
  onChangeField?: (fieldIds: string[]) => void;
};

const NoteGroup = ({ onChangeField }: Props) => {
  const [isExtended, setIsExtended] = React.useState(false);
  const { allNoteFields } = useNoteRecords();
  const [search, setSearch] = useSearchParams();
  const fieldId = search.get('fieldId');
  if (!isExtended) {
    return (
      <div>
        <Card className={styles.container}>
          <div
            onClick={() => {
              setIsExtended(!isExtended);
            }}
            className={styles.item}
          >
            <Icon icon="solar:hamburger-menu-outline" />
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
              className={cx(!fieldId && styles.iconActive)}
            />
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
                className={cx(
                  styles.item,
                  fieldId === f.id && styles.itemActive,
                )}
              >
                <Icon
                  icon={f.icon}
                  className={cx(fieldId === f.id && styles.iconActive)}
                />
              </div>
            );
          })}
        </Card>
      </div>
    );
  }
  return (
    <div>
      <Card className={styles.container}>
        <div
          onClick={() => {
            setIsExtended(!isExtended);
          }}
          className={styles.item}
        >
          <Icon
            icon="solar:hamburger-menu-outline"
            className={styles.menuButtonRotate}
          />
        </div>
        {/* <div className={styles.tabContainer}> */}
        {/*   <div className={styles.tabItem}><Typography.Text>Fields</Typography.Text></div> */}
        {/*   <div className={styles.tabItem}><Typography.Text>Tags</Typography.Text></div> */}
        {/* </div> */}
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
          <Typography.Text>All Notes</Typography.Text>
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
                className={cx(
                  styles.icon,
                  fieldId === f.id && styles.iconActive,
                )}
              />
              <Typography.Text>{f.title}</Typography.Text>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

export default NoteGroup;
