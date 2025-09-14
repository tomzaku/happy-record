import React from 'react';
import Card from '@moon-ui/card';
import Icon from '@moon-ui/icon/Icon';

import { useSearchParams } from 'react-router-dom';

import cx from 'classnames';
import styles from './index.desktop.module.scss';
import Typography from '@moon-ui/typography';
import { RecordField } from '@dreamer/global/src/store/record-field';

type Props = {
  onChangeField?: (fieldIds: string[]) => void;
  allNoteFields: RecordField[];
  isExtended: boolean;
  minimal: boolean;
  setIsExtended: (isExtended: boolean) => void;
};

const NoteGroupDesktop = ({
  onChangeField,
  allNoteFields,
  isExtended,
  setIsExtended,
  minimal,
}: Props) => {
  const [search, setSearch] = useSearchParams();
  const fieldId = search.get('fieldId');

  const activeField = allNoteFields.find(f => f.id === fieldId);

  return (
    <div className={styles.verticalSidebar}>
      <Card
        className={cx(styles.container, minimal && styles.containerMinimal)}
      >
        <div
          onClick={() => {
            setIsExtended(!isExtended);
          }}
          className={styles.item}
        >
          <Icon
            icon="solar:hamburger-menu-outline"
            className={cx(isExtended && styles.menuButtonRotate)}
          />
          {minimal && (
            <Typography.Text>
              {activeField ? <>{activeField.title}</> : 'All Notes'}
            </Typography.Text>
          )}
        </div>
        {minimal ? null : (
          <>
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
              {isExtended && <Typography.Text>All Notes</Typography.Text>}
            </div>
            {allNoteFields.map(f => {
              return (
                <div
                  key={f.id}
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
                    className={cx(
                      styles.icon,
                      fieldId === f.id && styles.iconActive,
                    )}
                  />
                  {isExtended && <Typography.Text>{f.title}</Typography.Text>}
                </div>
              );
            })}
          </>
        )}
      </Card>
    </div>
  );
};

export default NoteGroupDesktop;
