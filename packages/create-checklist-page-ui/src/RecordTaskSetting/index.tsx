import React from 'react';
import List from '@moon-ui/list';
import { Icon } from '@moon-ui/icon/Icon';
import { v4 } from 'uuid';
import Select from '@moon-ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
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
import EditFieldRecordDialog from './EditFieldRecordDialog';
import {
  useRecordField,
  RecordField,
} from '@dreamer/global/src/store/record-field';
import Typography from '@moon-ui/typography';
import DroppableGroup from './DroppableGroup';
import Button from '@moon-ui/button/src/DefaultButton';

type SortableItemProps = {
  id: string;
  children: ReactNode;
  isDragging?: boolean; // Add isDragging prop for DragOverlay styling
};

const SortableItem = ({ id, children, isDragging }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Hide the original item when dragging
    // Add other styles for the item if it's being dragged (for visual feedback)
    // e.g., boxShadow: isDragging ? '0px 2px 10px rgba(0, 0, 0, 0.2)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export type FieldGroup = {
  title: string;
  id: string; // Unique ID for the group
  fields: string[]; // Array of record IDs
  note: unknown;
};

const RecordTaskSetting = ({
  selectedRecords = [],
  setSelectedRecords,
  fieldGroups,
  setFieldGroups,
}: {
  selectedRecords: string[];
  setSelectedRecords: (records: string[]) => void;
  fieldGroups: FieldGroup[];
  setFieldGroups: (fieldGroups: FieldGroup[]) => void;
}) => {
  const { getAllRecordFields, removeRecordField } = useRecordField();
  const intl = useIntl();
  const [showAddFieldRecord, setShowAddFieldRecord] = React.useState(false);
  const [showEditFieldRecord, setShowEditFieldRecord] = React.useState(false);
  const [editingRecordField, setEditingRecordField] =
    React.useState<RecordField | null>(null);
  const [recordFields, setRecordFields] = React.useState(getAllRecordFields());
  const [activeId, setActiveId] = React.useState<string | null>(null); // To track the dragged item

  React.useEffect(() => {
    setRecordFields(getAllRecordFields());
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findGroupContainer = (id: string) => {
    if (id in fieldGroups) {
      return id;
    }

    for (const group of fieldGroups) {
      if (group.fields.includes(id)) {
        return group.id;
      }
    }
    return null;
  };

  const getRecordById = (id: string) => recordFields.find(r => r.id === id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); // Reset activeId after drag ends

    if (!over) return;

    const activeGroup = findGroupContainer(active.id as string);
    const overGroup = findGroupContainer(over.id as string);

    // Case 1: Dragging within the same group
    if (activeGroup && overGroup && activeGroup === overGroup) {
      const newGroups = [...fieldGroups];
      const groupIndex = newGroups.findIndex(group => group.id === activeGroup);
      if (groupIndex !== -1) {
        const oldIndex = newGroups[groupIndex].fields.indexOf(
          active.id as string,
        );
        const newIndex = newGroups[groupIndex].fields.indexOf(
          over.id as string,
        );
        newGroups[groupIndex].fields = arrayMove(
          newGroups[groupIndex].fields,
          oldIndex,
          newIndex,
        );
      }
      setFieldGroups(newGroups);
    }
    // Case 2: Dragging between different groups
    else if (activeGroup && overGroup && activeGroup !== overGroup) {
      const newGroups = [...fieldGroups];

      const sourceGroupIndex = newGroups.findIndex(
        group => group.id === activeGroup,
      );
      const destinationGroupIndex = newGroups.findIndex(
        group => group.id === overGroup,
      );

      if (sourceGroupIndex !== -1 && destinationGroupIndex !== -1) {
        const [movedItem] = newGroups[sourceGroupIndex].fields.splice(
          newGroups[sourceGroupIndex].fields.indexOf(active.id as string),
          1,
        );

        const overIndex = newGroups[destinationGroupIndex].fields.indexOf(
          over.id as string,
        );
        if (overIndex !== -1) {
          newGroups[destinationGroupIndex].fields.splice(
            overIndex,
            0,
            movedItem,
          );
        } else {
          // If dropped on the group itself (and not on an item within it)
          newGroups[destinationGroupIndex].fields.push(movedItem);
        }
      }
      setFieldGroups(newGroups);
    }
    // Case 3: Dropped on a group that is empty or the group itself (not on an item within it)
    else if (
      activeGroup &&
      over.data?.current?.type === 'Group' &&
      activeGroup !== over.id
    ) {
      const newGroups = [...fieldGroups];
      const sourceGroupIndex = newGroups.findIndex(
        group => group.id === activeGroup,
      );
      const destinationGroupIndex = newGroups.findIndex(
        group => group.id === over.id,
      );

      if (sourceGroupIndex !== -1 && destinationGroupIndex !== -1) {
        const [movedItem] = newGroups[sourceGroupIndex].fields.splice(
          newGroups[sourceGroupIndex].fields.indexOf(active.id as string),
          1,
        );
        newGroups[destinationGroupIndex].fields.push(movedItem); // Add to the end of the destination group
      }
      setFieldGroups(newGroups);
    }
  };

  const handleAddRecordToGroup = ({ id }: { id: string }) => {
    // This function needs to decide which group to add to, or create a new one.
    // The logic here is adapted from your existing `onChange` for the `Select` component.
    const uniqRecords = new Set([...selectedRecords, id]);
    setSelectedRecords([...uniqRecords]);

    const newGroups = [...fieldGroups];
    // Find if the record is already in any group (to avoid duplicates in display)
    const isAlreadyInGroup = newGroups.some(group => group.fields.includes(id));
    if (!isAlreadyInGroup) {
      setFieldGroups([
        ...newGroups,
        {
          id: v4(), // Unique ID for new group
          title:
            intl.formatMessage({
              id: 'label-group',
              defaultMessage: 'Group',
            }) + ` ${newGroups.length + 1}`, // Dynamic title
          fields: [id],
          note: null,
        },
      ]);
    }
  };

  const handleRemoveRecord = (idToRemove: string) => {
    setSelectedRecords(selectedRecords.filter(r => r !== idToRemove));
    const newGroups = fieldGroups
      .map(group => ({
        ...group,
        fields: group.fields.filter(fieldId => fieldId !== idToRemove),
      }))
      .filter(group => group.fields.length > 0); // Remove empty groups
    setFieldGroups(newGroups);
  };

  const handleEditRecordField = (recordField: RecordField) => {
    setEditingRecordField(recordField);
    setShowEditFieldRecord(true);
  };

  const handleDeleteRecordField = (idToDelete: string) => {
    // Remove from record fields
    removeRecordField(idToDelete);
    setRecordFields(getAllRecordFields());

    // Remove from selected records and groups
    handleRemoveRecord(idToDelete);
  };

  const activeRecord = activeId ? getRecordById(activeId) : null;
  console.log('FieldGroup', fieldGroups);

  return (
    <div>
      <AddFieldRecordDialog
        visible={showAddFieldRecord}
        onSubmit={newRcordField => {
          setShowAddFieldRecord(false);
          //reload field add field;
          setRecordFields([...recordFields, newRcordField]);
          handleAddRecordToGroup({ id: newRcordField.id });
        }}
        onClose={() => setShowAddFieldRecord(false)}
      />
      <EditFieldRecordDialog
        visible={showEditFieldRecord}
        recordField={editingRecordField}
        onSubmit={updatedRecordField => {
          setShowEditFieldRecord(false);
          setEditingRecordField(null);
          // Reload fields to reflect changes
          setRecordFields(getAllRecordFields());
        }}
        onClose={() => {
          setShowEditFieldRecord(false);
          setEditingRecordField(null);
        }}
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
                    <div className={styles.selected} key={id}>
                      <Typography.Text>{field?.title}</Typography.Text>
                      <div
                        style={{
                          display: 'flex',
                          gap: '4px',
                          alignItems: 'center',
                        }}
                        onMouseDown={e => e.stopPropagation()}
                        onTouchStart={e => e.stopPropagation()}
                      >
                        {/* <Icon */}
                        {/*   width={16} */}
                        {/*   height={16} */}
                        {/*   icon="material-symbols:edit-outline" */}
                        {/*   onClick={(e) => { */}
                        {/*     e.stopPropagation(); */}
                        {/*     if (field) handleEditRecordField(field); */}
                        {/*   }} */}
                        {/*   onMouseDown={(e) => e.stopPropagation()} */}
                        {/*   onTouchStart={(e) => e.stopPropagation()} */}
                        {/*   style={{ cursor: 'pointer', color: '#666' }} */}
                        {/* /> */}
                        {/* <Icon */}
                        {/*   width={16} */}
                        {/*   height={16} */}
                        {/*   icon="material-symbols:delete-outline" */}
                        {/*   onClick={(e) => { */}
                        {/*     e.stopPropagation(); */}
                        {/*     handleDeleteRecordField(id); */}
                        {/*   }} */}
                        {/*   onMouseDown={(e) => e.stopPropagation()} */}
                        {/*   onTouchStart={(e) => e.stopPropagation()} */}
                        {/*   style={{ cursor: 'pointer', color: '#ff4444' }} */}
                        {/* /> */}
                        <Icon
                          icon={'material-symbols:close-rounded'}
                          width={16}
                          height={16}
                          className={styles.closeIcon}
                          onClick={() => handleRemoveRecord(id)}
                        />
                      </div>
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
          handleAddRecordToGroup({ id });
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.groupsContainer}>
          {/* Add a container for groups */}
          {fieldGroups.map((group, index) => (
            <DroppableGroup
              key={group.id}
              id={group.id}
              title={group.title}
              items={group.fields}
              note={group.note}
              onSubmitRename={text => {
                setFieldGroups([
                  ...fieldGroups.slice(0, index),
                  {
                    ...fieldGroups[index],
                    title: text,
                  },
                  ...fieldGroups.slice(index + 1),
                ]);
              }}
              onSubmitNote={value => {
                setFieldGroups([
                  ...fieldGroups.slice(0, index),
                  {
                    ...fieldGroups[index],
                    note: value,
                  },
                  ...fieldGroups.slice(index + 1),
                ]);
              }}
            >
              {group.fields.map(recordKey => {
                const record = getRecordById(recordKey);

                if (!record) return null;
                return (
                  <SortableItem key={recordKey} id={recordKey}>
                    <List.ItemMeta
                      logo={<Icon width={24} icon={'ci:drag-vertical'} />}
                      className={styles.item}
                      title={record.title}
                      description={record.description}
                      rightComponent={
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                          }}
                          onMouseDown={e => e.stopPropagation()}
                          onTouchStart={e => e.stopPropagation()}
                        >
                          <Icon
                            width={20}
                            height={20}
                            icon="material-symbols:edit-outline"
                            onClick={e => {
                              e.stopPropagation();
                              handleEditRecordField(record);
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            onTouchStart={e => e.stopPropagation()}
                            style={{ cursor: 'pointer', color: '#666' }}
                          />
                          {/* <Icon */}
                          {/*   width={20} */}
                          {/*   height={20} */}
                          {/*   icon="material-symbols:delete-outline" */}
                          {/*   onClick={(e) => { */}
                          {/*     e.stopPropagation(); */}
                          {/*     handleDeleteRecordField(recordKey); */}
                          {/*   }} */}
                          {/*   onMouseDown={(e) => e.stopPropagation()} */}
                          {/*   onTouchStart={(e) => e.stopPropagation()} */}
                          {/*   style={{ cursor: 'pointer', color: '#ff4444' }} */}
                          {/* /> */}
                        </div>
                      }
                    />
                  </SortableItem>
                );
              })}
            </DroppableGroup>
          ))}
        </div>

        <DragOverlay>
          {activeId && activeRecord ? (
            <List.ItemMeta
              className={styles.listItemMeta}
              logo={<Icon width={24} icon={'ci:drag-vertical'} />}
              title={activeRecord.title}
              description={activeRecord.description}
              // rightComponent={
              //   <Checkbox
              //     checked={selectedRecords.includes(activeRecord.id)}
              //     size="lg"
              //     readOnly // Make it non-interactive in overlay
              //   />
              // }
              style={{
                backgroundColor: '#fff', // Ensure background for overlay
                borderRadius: '8px',
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '15px',
                width: '300px', // Adjust as needed
              }}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default RecordTaskSetting;
