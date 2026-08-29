import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { generateNote, type AiNoteOption } from '@dreamer/global/src/store/note/aiNoteApi';
import { useIsPro } from '@dreamer/global/src/store/pro/useProStatus';
import { buildEditorJsBlocks, type EditorJsBlockInput } from '@dreamer/global/src/lib/editorJsNoteBlocks';
import NoteEditor from '@moon-ui/note-editor';
import Typography from '@moon-ui/typography';
import List from '@moon-ui/list';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';

import styles from './index.module.scss';

type Props = {
  record: ChecklistRecord;
  fields: RecordField[];
  setRecord: (record: ChecklistRecord) => void;
};

const ChecklistFieldGeneral = ({ record, fields, setRecord }: Props) => {
  // A `type: 'note'` field's own value here is a checklist journal entry, not the field's single
  // current note (that's the standalone notebook's own thing — see useNote.tsx's `Note` doc
  // comment) — one row per submission, editable in place from History same as a metric field.
  // Routes to `notes` server-side (see checklist-records/index.ts), but the client never has to
  // know that — this is the exact same `updateChecklistRecord` call a metric field's own edit
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
