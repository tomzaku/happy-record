import React from 'react';
import List from '@moon-ui/list';
import { Icon } from '@moon-ui/icon/Icon';
import Select from '@moon-ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import Checkbox from '@moon-ui/checkbox';
import AddFieldRecordDialog from './AddFieldRecordDialog';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import Typography from '@moon-ui/typography';

interface SortableItemProps {
  id: string;
  children: ReactNode;
}

const SortableItem = ({ id, children }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

type Group = {
  title: string;
  fields: string[];
};

const RecordTaskSetting = ({
  selectedRecords = [],
  setSelectedRecords,
}: {
  selectedRecords: string[];
  setSelectedRecords: (records: string[]) => void;
}) => {
  const { getAllRecordFields } = useRecordField();
  const intl = useIntl();
  const [showAddFieldRecord, setShowAddFieldRecord] = React.useState(false);
  const [recordFields, setRecordFields] = React.useState(getAllRecordFields());
  const [groups, setGroups] = React.useState<Group[]>([]);
  React.useEffect(() => {
    setRecordFields(getAllRecordFields());
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSelectedRecords((items: string[]) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div>
      <AddFieldRecordDialog
        visible={showAddFieldRecord}
        onClose={() => setShowAddFieldRecord(false)}
      />
      <Select
        options={recordFields.map(r => ({
          ...r,
          label: r.title,
          value: r.id,
        }))}
        classes={{
          container: styles.selector,
        }}
        renderInput={() => {
          if (selectedRecords.length === 0) {
            return <Typography.Text>Record & Metric</Typography.Text>;
          } else {
            return (
              <div className={styles.resultInput}>
                {selectedRecords.map(id => {
                  const field = recordFields.find(r => r.id === id);
                  return (
                    <div className={styles.selected}>
                      <Typography.Text>{field?.title}</Typography.Text>
                      <Icon
                        icon={'material-symbols:close-rounded'}
                        width={16}
                        height={16}
                        className={styles.closeIcon}
                        onClick={() => {
                          setSelectedRecords(
                            selectedRecords.filter(r => r !== id),
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          }
        }}
        renderOptionFooter={({ close }) => (
          <div
            onClick={() => {
              setShowAddFieldRecord(true);
              close();
            }}
            className={styles.addCustomField}
          >
            <Typography.Text>
              {intl.formatMessage({
                id: 'label-add-custom-field',
                defaultMessage: 'Add custom field',
              })}
            </Typography.Text>
          </div>
        )}
        onChange={({ id }, { close }) => {
          close();
          const uniqRecords = new Set([...selectedRecords, id]);
          setSelectedRecords([...uniqRecords]);
        }}
        renderOption={r => (
          <List.ItemMeta
            className={styles.selectorCard}
            logo={<Icon width={24} icon={r.icon} />}
            title={r.title}
            description={r.description}
          />
        )}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={selectedRecords}
          strategy={verticalListSortingStrategy}
        >
          {selectedRecords.map(recordKey => {
            const record = recordFields.find(r => r.id === recordKey);
            if (!record) return null;
            return (
              <SortableItem key={recordKey} id={recordKey}>
                <List.ItemMeta
                  className={styles.selectorCard}
                  logo={<Icon width={24} icon={record.icon} />}
                  title={record.title}
                  description={record.description}
                  rightComponent={
                    <Checkbox
                      checked={true}
                      size="lg"
                      onClick={() => {
                        setSelectedRecords(
                          selectedRecords.filter(r => r !== recordKey),
                        );
                      }}
                    />
                  }
                />
              </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default RecordTaskSetting;
