import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { generateNote, type AiNoteOption } from '@dreamer/global/src/store/note/aiNoteApi';
import { useIsPro } from '@dreamer/global/src/store/pro/useProStatus';
import { buildEditorJsBlocks, type EditorJsBlockInput } from '@dreamer/global/src/lib/editorJsNoteBlocks';
import {
  dateInputValueToIso,
  datetimeLocalInputValueToIso,
  formatFieldValueForDisplay,
  isoToDatetimeLocalInputValue,
} from '@dreamer/global/src/lib/fieldValueFormat';
import { parseMultiselect, serializeMultiselect } from '@dreamer/global/src/lib/multiselectValue';
import NoteEditor from '@moon-ui/note-editor';
import Typography from '@moon-ui/typography';
import List from '@moon-ui/list';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import DatePicker from '@moon-ui/date-picker';
import Checkbox from '@moon-ui/checkbox';
import cx from 'classnames';

import styles from './index.module.scss';

type Props = {
  record: ChecklistRecord;
  fields: RecordField[];
  setRecord: (record: ChecklistRecord) => void;
};

const ChecklistFieldGeneral = ({ record, fields, setRecord }: Props) => {
  // A `type: 'note'` field's own value here is a checklist journal entry, not the field's single
  // current note (that's the standalone notebook's own thing — see useNote.tsx's `Note` doc
  // comment) — one row per submission, editable in place from History same as a number field.
  // Routes to `notes` server-side (see checklist-records/index.ts), but the client never has to
  // know that — this is the exact same `updateChecklistRecord` call a number field's own edit
  // makes, just with an Editor.js `OutputData` object instead of a numeric `value`. No title sent
  // from here — there's no title input in this UI; the server derives one from the content
  // itself when none is given (see _shared/notes.ts's deriveTitle).
  const { updateChecklistRecord } = useChecklistRecord();
  const { isPro } = useIsPro();
  const field = fields.find(f => f.id === record.fieldId);
  if (!field) return;
  const [activeRecord, setActiveRecord] = React.useState<ChecklistRecord>();
  const [isEditingNote, setIsEditingNote] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // "/ai" inside the note editor below — `record.id` is this entry's own real note id (it
  // already exists, unlike a not-yet-submitted one in ChecklistFieldGroupAdd), so this resolves
  // its own real surrounding content server-side instead of generating with zero awareness of it
  // — same shape useNoteById.ts's own `generate` uses, just without that hook's fetch/save
  // machinery (this component already has the record's content via its own `record` prop).
  const generate = async (
    prompt: string,
    options: AiNoteOption[],
    context: { blockIndex: number },
  ): Promise<EditorJsBlockInput[]> => {
    const { blocks } = await generateNote({ prompt, options, noteId: record.id, blockIndex: context.blockIndex });
    return buildEditorJsBlocks(blocks);
  };

  switch (field.type) {
    case 'note': {
      return (
        <div>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            rightComponent={
              <Icon
                width={24}
                className={styles.iconEdit}
                onClick={() => setIsEditingNote(prev => !prev)}
                icon={isEditingNote ? 'material-symbols:check' : 'solar:pen-2-line-duotone'}
              />
            }
          />
          {/* No title input here — a note entry's title is derived server-side from its own
              content when none is given (see _shared/notes.ts's deriveTitle), not typed in. */}
          <NoteEditor
            value={record.value}
            setValue={(value: unknown) => {
              updateChecklistRecord(record.id, {
                checklistTemplateId: record.checklistTemplateId,
                value: value as unknown as string,
              });
              setRecord({ ...record, value: value as unknown as string });
            }}
            readOnly={!isEditingNote}
            withoutBorder
            ai={{ isPro, generate }}
          />
        </div>
      );
    }
    // `text`/`date`/`datetime` are all a plain string value (see useRecordField.tsx's own `type`
    // comment) — same edit-in-place shape number's own case has (an `activeRecord`/`inputRef`
    // pair, committed on the checkmark), just a different input control per type and no
    // `Number()` coercion.
    case 'text':
    case 'date':
    case 'datetime': {
      const isEditing = activeRecord?.id === record.id;
      const commit = (value: string) => {
        updateChecklistRecord(record.id, {
          checklistTemplateId: record.checklistTemplateId,
          value,
        });
        setRecord({ ...record, value });
        setActiveRecord(undefined);
      };
      return (
        <List.ItemMeta
          logo={<Icon width={24} icon={field.icon} />}
          title={field.title}
          rightComponent={
            isEditing ? (
              <>
                {field.type === 'text' && (
                  <Input
                    value={String(activeRecord.value)}
                    ref={inputRef}
                    autoFocus
                    border="dash"
                    className={styles.textLikeInput}
                    onChange={e => setActiveRecord({ ...record, value: e.target.value })}
                  />
                )}
                {field.type === 'date' && (
                  <DatePicker
                    value={String(activeRecord.value)}
                    className={styles.textLikeInput}
                    onChange={e => {
                      const iso = dateInputValueToIso(e.target.value);
                      if (iso) setActiveRecord({ ...record, value: iso });
                    }}
                  />
                )}
                {field.type === 'datetime' && (
                  <input
                    type="datetime-local"
                    className={cx(styles.textLikeInput, styles.nativeDateInput)}
                    value={isoToDatetimeLocalInputValue(String(activeRecord.value))}
                    onChange={e => {
                      const iso = datetimeLocalInputValueToIso(e.target.value);
                      if (iso) setActiveRecord({ ...record, value: iso });
                    }}
                  />
                )}
                <Icon
                  width={24}
                  className={styles.icon}
                  onClick={() => setActiveRecord(undefined)}
                  icon="proicons:cancel"
                />
                <Icon
                  width={24}
                  className={styles.icon}
                  onClick={() => commit(String(activeRecord.value))}
                  icon="material-symbols:check"
                />
              </>
            ) : (
              <>
                <Typography.Text> {formatFieldValueForDisplay(field.type, record.value)}</Typography.Text>
                <Icon
                  width={24}
                  className={styles.iconEdit}
                  onClick={() => setActiveRecord(record)}
                  icon="solar:pen-2-line-duotone"
                />
              </>
            )
          }
        />
      );
    }
    // `select`'s own value is the chosen option (a plain string, same shape `text` already is);
    // `multiselect`'s is a JSON-encoded array of chosen options in that same string slot (see
    // lib/multiselectValue.ts) — both edit in place the same way every other type here does, just
    // with a list of pickable rows below the field's own header row instead of a single inline
    // input, since there's no single-line control for "pick from a fixed list" the way Input/
    // DatePicker are for text/date.
    case 'select':
    case 'multiselect': {
      const isEditing = activeRecord?.id === record.id;
      const isMulti = field.type === 'multiselect';
      const draftValue = isEditing ? activeRecord.value : record.value;
      const selected = isMulti ? parseMultiselect(draftValue) : draftValue ? [String(draftValue)] : [];

      const toggle = (option: string) => {
        if (isMulti) {
          const next = selected.includes(option)
            ? selected.filter(o => o !== option)
            : [...selected, option];
          setActiveRecord({ ...record, value: serializeMultiselect(next) });
        } else {
          setActiveRecord({ ...record, value: option });
        }
      };

      return (
        <div>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            rightComponent={
              isEditing ? (
                <>
                  <Icon
                    width={24}
                    className={styles.icon}
                    onClick={() => setActiveRecord(undefined)}
                    icon="proicons:cancel"
                  />
                  <Icon
                    width={24}
                    className={styles.icon}
                    onClick={() => {
                      updateChecklistRecord(record.id, {
                        checklistTemplateId: record.checklistTemplateId,
                        value: activeRecord.value,
                      });
                      setRecord({ ...record, value: activeRecord.value });
                      setActiveRecord(undefined);
                    }}
                    icon="material-symbols:check"
                  />
                </>
              ) : (
                <>
                  <Typography.Text> {formatFieldValueForDisplay(field.type, record.value)}</Typography.Text>
                  <Icon
                    width={24}
                    className={styles.iconEdit}
                    onClick={() => setActiveRecord(record)}
                    icon="solar:pen-2-line-duotone"
                  />
                </>
              )
            }
          />
          {isEditing && (
            <div className={styles.optionList}>
              {(field.options ?? []).map(option => (
                <label key={option} className={styles.optionRow}>
                  {isMulti ? (
                    <Checkbox checked={selected.includes(option)} onChange={() => toggle(option)} />
                  ) : (
                    <input
                      type="radio"
                      className={styles.optionRadio}
                      checked={selected.includes(option)}
                      onChange={() => toggle(option)}
                    />
                  )}
                  <Typography.Text>{option}</Typography.Text>
                </label>
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'number':
    default: {
      return (
        <>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            rightComponent={
              activeRecord?.id === record.id ? (
                <>
                  <Input
                    value={activeRecord.value}
                    ref={inputRef}
                    autoFocus
                    border="dash"
                    className={styles.input}
                    onChange={e => {
                      setActiveRecord({
                        ...record,
                        value: Number(e.target.value),
                      });
                    }}
                  />
                  <Icon
                    width={24}
                    className={styles.icon}
                    onClick={() => {
                      setActiveRecord(undefined);
                    }}
                    icon="proicons:cancel"
                  />
                  <Icon
                    width={24}
                    className={styles.icon}
                    onClick={() => {
                      updateChecklistRecord(record.id, {
                        checklistTemplateId: record.checklistTemplateId,
                        value: Number(inputRef.current?.value),
                      });
                      setRecord({
                        ...record,
                        value: Number(inputRef.current?.value),
                      });
                      setActiveRecord(undefined);
                    }}
                    icon="material-symbols:check"
                  />
                </>
              ) : (
                <>
                  <Typography.Text> {record.value}</Typography.Text>
                  <Icon
                    width={24}
                    className={styles.iconEdit}
                    onClick={() => {
                      setActiveRecord(record);
                      setTimeout(() => inputRef?.current?.focus(), 100);
                    }}
                    icon="solar:pen-2-line-duotone"
                  />
                </>
              )
            }
          />
        </>
      );
    }
  }
};

export default ChecklistFieldGeneral;
