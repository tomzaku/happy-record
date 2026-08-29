import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import NoteEditor, { type NoteEditorHandle } from '@moon-ui/note-editor';
import { v4 } from 'uuid';

import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import { Checklist, ChecklistTemplate, useAiNoteGenerate } from '@dreamer/global';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { useChecklistFieldNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
import {
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isToday,
} from 'date-fns';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import { useIntl } from '@dreamer/translation';
import WeeklyRow from '../WeeklyRow';
import ChecklistFieldGroupHistory from '../ChecklistFieldGroupHistory';

type Props = {
  fields: RecordField[];
  checklistTemplate: ChecklistTemplate;
  checklist: Checklist;
  currentDay: string;
  onSubmit?: () => void;
  // Opens this group's own Select Fields dialog (ChecklistFieldGroupMenu, via
  // ChecklistFieldGroup's ref map) — lets someone filling out the Submit tab jump straight to
  // adding/removing fields without first finding the "⋮" settings menu on the group header.
  onOpenFieldSettings?: () => void;
};

// A metric record's `value` can be null/undefined/a non-numeric string —
// old bad submissions, a note-type field's value shape leaking in, or a
// backend row saved before a value existed. `+b` on any of those turns the
// whole running sum into NaN, so this filters to real finite numbers first
// rather than trusting every record already has one.
const toFiniteNumber = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const sum = (arr: unknown[]) =>
  arr.reduce<number>((a, b) => a + (toFiniteNumber(b) ?? 0), 0);

// Editor.js's own `.save()` always resolves to a real OutputData object, blocks and all, even
// for a note nobody touched — so "was this field actually filled in" can't just be "is the value
// defined" the way a metric field's own `fieldRecord[id] !== undefined` check works. Has to look
// at whether there's a block with real content in it.
const hasNoteContent = (value: unknown): boolean => {
  const blocks = (value as { blocks?: unknown[] } | null | undefined)?.blocks;
  if (!Array.isArray(blocks)) return false;
  return blocks.some(block => {
    const data = (block as { data?: Record<string, unknown> } | null)?.data;
    if (!data) return false;
    if (typeof data.text === 'string') return data.text.trim().length > 0;
    if (Array.isArray(data.items)) return data.items.length > 0;
    return Object.keys(data).length > 0;
  });
};
const ChecklistFieldGroupAdd = ({
  fields,
  checklistTemplate,
  checklist,
  currentDay,
  onSubmit,
  onOpenFieldSettings,
}: Props) => {
  // A `type: 'note'` field's own value is a checklist journal entry (see ChecklistFieldGeneral's
  // own comment) — one new note per Submit click, same shape a metric field's own record already
  // has. `fields` here is still this whole group's list (used elsewhere for override merging),
  // so this component splits it itself rather than assuming the caller already did.
  const metricFields = fields.filter(field => field.type === 'metric');
  const noteFields = fields.filter(field => field.type === 'note');
  // Pre-fills a metric field's own default value (set via the Edit Field
  // form — see CoreFieldRecord) instead of always starting blank; still
  // fully editable, and a field with no default set stays blank exactly as
  // before.
  const getEmptyFieldRecord = () => {
    return metricFields.reduce(
      (acc, { id, defaultValue }) => ({
        ...acc,
        [id]: defaultValue,
      }),
      {},
    );
  };
  const [fieldRecord, setFieldRecord] = React.useState<
    Record<string, number | undefined>
  >(getEmptyFieldRecord());
  // Read directly at Submit time (see hasNoteContent/the onClick handler below) instead of
  // tracked via `setValue` state — Editor.js's own `onChange` is debounced internally (its own
  // MutationObserver handler, not something this component controls), so a keystroke followed
  // immediately by clicking Submit could otherwise beat that debounce and submit stale (or
  // entirely missing) content. `getValue()` (NoteEditorHandle, see @moon-ui/note-editor) asks
  // Editor.js for its real current state instead of trusting whatever was last reported.
  const noteEditorRefs = React.useRef<Record<string, NoteEditorHandle | null>>({});
  const [noteFieldTitles, setNoteFieldTitles] = React.useState<Record<string, string>>({});
  const { addChecklistRecord, getChecklistRecords } = useChecklistRecord();
  const { getChecklistFieldNotes, addChecklistFieldNote } = useChecklistFieldNoteRecords();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    ChecklistRecord[]
  >([]);
  // Forces a remount after submit — both Input and NoteEditor only read
  // their `value` prop once, at mount (see @moon-ui/input, @moon-ui/note-editor),
  // so resetting `fieldRecord` alone doesn't clear what's already on screen.
  const [newNoteKey, setNewNoteKey] = React.useState(v4());
  // "/ai" inside the note-type field editor below — see add-note-page-ui's own AddNotePage for
  // the same wiring (no real note/record yet to resolve context from, same as there).
  const { isPro, generate } = useAiNoteGenerate();

  // Add ref to track previous records for shake animation
  const prevRecordsRef = React.useRef<ChecklistRecord[]>([]);

  // State for shake animation
  const [isShaking, setIsShaking] = React.useState(false);

  // State for showing history
  const [showHistory, setShowHistory] = React.useState(false);

  // Trigger shake animation when records change
  React.useEffect(() => {
    if (currentChecklistRecords.length > prevRecordsRef.current.length) {
      // Shake animation when new records are added
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    }
    prevRecordsRef.current = currentChecklistRecords;
  }, [currentChecklistRecords]);

  const reloadChecklistRecord = () => {
    // `fieldIds: []` means "no filter" to getChecklistRecords (see that hook's own comment),
    // not "match nothing" — has to be guarded rather than always called, or a note-only group
    // would pull back every field's records for this template.
    const metricFieldIds = metricFields.map(field => field.id);
    const noteFieldIds = noteFields.map(field => field.id);
    const records = metricFieldIds.length
      ? getChecklistRecords(checklistTemplate.id, {
        rangeDate: {
          from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
          to: new Date(
            new Date(currentDay).setHours(23, 59, 59, 999),
          ).toISOString(),
        },
        fieldIds: metricFieldIds,
        sortDirection: 'desc',
      })
      : {};
    const noteRecords = noteFieldIds.length
      ? getChecklistFieldNotes(checklist.id, noteFieldIds)
      : [];
    // Flatten the records object into an array
    const flattenedRecords = [...Object.values(records).flat(), ...noteRecords];
    setCurrentChecklistRecords(flattenedRecords);
    if (flattenedRecords.length === 0) {
      setShowHistory(true)
    }
    return records;
  };
  const today = isToday(currentDay);
  const intl = useIntl();
  // `reloadChecklistRecord` has side effects beyond a pure read
  // (`setShowHistory`), so this stays an effect rather than becoming a
  // `useSyncedSelector` — but its deps were missing `checklistTemplate.id`,
  // `fields`, and `getChecklistRecords` itself, so a record submitted on
  // another device (or a field list synced in) never refired this and just
  // sat un-rendered. `getChecklistRecords`/`getChecklistFieldNotes` are plain closures today (a
  // new identity every render until either is `useCallback`-wrapped), so this still refires on
  // every render — correct, just not free.
  React.useEffect(() => {
    reloadChecklistRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDay, checklistTemplate.id, fields, getChecklistRecords, getChecklistFieldNotes]);

  const renderEmpty = () => {
    return null;
    return (
      <div>
        <div className={styles.emptyContainer}>
          <Icon
            width={80}
            // color="#00000024"
            icon="clarity:sad-face-line"
            className={styles.iconEmpty}
          />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage(
              {
                id: 'ChecklistFieldGroupView.noRecord',
                defaultMessage: 'No record found on {{day}}',
              },
              {
                day: today
                  ? intl.formatMessage({
                    id: 'ChecklistFieldGroupView.today',
                    defaultMessage: 'today',
                  })
                  : new Date(currentDay).toLocaleDateString(),
              },
            )}
          </Typography.Title>
          <Typography.Paragraph noMargin onClick={() => { }} style={{}}>
            {intl.formatMessage({
              id: 'ChecklistFieldGroupView.noRecordDescription',
              defaultMessage:
                'Submit your record to keep track of your progress',
            })}
          </Typography.Paragraph>
        </div>
      </div>
    );
  };
  const renderCurrentDay = () => {
    return (
      <div className={styles.historyContainer}>
        <div className={styles.historyBody}>
          <Icon
            width={100}
            color="rgba(16,154,0,0.1)"
            icon="ion:checkmark-done-circle-outline"
            className={`${styles.iconSuccess} ${isShaking ? styles.shake : ''}`}
          />
          <Typography.Title level={4}>
            {intl.formatMessage(
              {
                id: 'ChecklistFieldGroupView.record-day',
                defaultMessage: 'Record on {{day}}',
              },
              {
                day: today
                  ? intl.formatMessage({
                    id: 'ChecklistFieldGroupView.current-day',
                    defaultMessage: 'today',
                  })
                  : new Date(currentDay).toLocaleDateString(),
              },
            )}
          </Typography.Title>
          {fields.map(recordField => {
            if (recordField.type === 'metric') {
              const recordValues = Object.values(currentChecklistRecords)
                .flat()
                .filter(record => record.fieldId === recordField.id);
              const sumValue = sum(recordValues.map(record => record.value));
              return (
                <List.ItemMeta
                  key={recordField.id}
                  logo={<Icon width={24} icon={recordField.icon} />}
                  title={recordField.title}
                  rightComponent={
                    <>
                      <Typography.Title
                        level={1}
                        noMargin
                        className={styles.sumValueText}
                      >
                        {sumValue}
                      </Typography.Title>
                      <Typography.Text>{recordField.unit}</Typography.Text>
                    </>
                  }
                />
              );
            } else {
              const latestRecord = currentChecklistRecords.find(
                record => record.fieldId === recordField.id,
              );
              if (!latestRecord) {
                return null;
              }
              return (
                <React.Fragment key={latestRecord.id}>
                  <List.ItemMeta
                    logo={<Icon width={24} icon={recordField.icon} />}
                    title={recordField.title}
                  />
                  <NoteEditor
                    key={latestRecord.id}
                    value={latestRecord.value}
                    readOnly
                    withoutBorder
                  />
                </React.Fragment>
              );
            }
          })}
        </div>
      </div>
    );
  };
  return (
    <>
      <WeeklyRow currentDay={currentDay} />
      {metricFields.map(field => (
        <List.ItemMeta
          key={field.id}
          logo={<Icon width={24} icon={field.icon} />}
          title={field.title}
          rightComponent={
            <>
              <Input
                key={`${field.id}-${newNoteKey}`}
                suffix={<Typography.Text>{field.unit}</Typography.Text>}
                value={fieldRecord[field.id] === undefined ? '' : String(fieldRecord[field.id])}
                onChange={e => {
                  setFieldRecord({
                    ...fieldRecord,
                    [field.id]: Number(e.target.value),
                  });
                }}
                border="dash"
                className={styles.input}
                type="number"
                // Only ever set via a group's own override (see getEffectiveFieldDisplay
                // in ChecklistFieldGroup) — a field has no placeholder of its own.
                placeholder={field.placeholder}
              />
            </>
          }
        />
      ))}
      {noteFields.map(field => (
        <div key={field.id} className={styles.noteField}>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
          />
          <Input
            key={`${field.id}-title-${newNoteKey}`}
            value={noteFieldTitles[field.id] ?? ''}
            onChange={e => setNoteFieldTitles({ ...noteFieldTitles, [field.id]: e.target.value })}
            placeholder="Title"
            border="dash"
            className={styles.titleInput}
          />
          <NoteEditor
            key={`${field.id}-${newNoteKey}`}
            ref={handle => {
              noteEditorRefs.current[field.id] = handle;
            }}
            withoutBorder
            ai={{ isPro, generate }}
          />
        </div>
      ))}
      <div className={styles.footerCenter}>
        {onOpenFieldSettings ? (
          <button
            type="button"
            className={styles.fieldSettingsLink}
            onClick={onOpenFieldSettings}
          >
            {intl.formatMessage({
              id: 'checklist-field-group-add.field-settings',
              defaultMessage: 'Field Settings',
            })}
          </button>
        ) : (
          // Keeps Submit pinned to the right even when this group has no onOpenFieldSettings —
          // footerCenter is `space-between` now, not `flex-end`, so it needs something on the
          // left to push against.
          <span />
        )}
        <Button
          size="lg"
          className={styles.submitBtn}
          onClick={async () => {
            // Reads each note field's real current content directly from its own editor
            // instance (see noteEditorRefs' own comment) rather than trusting state a debounced
            // `onChange` may not have reported yet — this is the one place that actually matters:
            // right this tick, not a later render.
            const noteFieldEntries = await Promise.all(
              noteFields.map(async field => ({
                field,
                value: await noteEditorRefs.current[field.id]?.getValue(),
              })),
            );
            const touchedNoteFields = noteFieldEntries.filter(({ value }) => hasNoteContent(value));

            // Nothing filled in — addChecklistRecord (see useChecklistRecord.ts) returns
            // undefined for an empty records array rather than writing a no-op submission,
            // so this has to bail before that, not rely on `result` being spreadable below.
            // A touched note field counts too, even with no metric value alongside it.
            const hasAnyValue =
              Object.values(fieldRecord).some(value => value !== undefined) ||
              touchedNoteFields.length > 0;
            if (checklistTemplate && hasAnyValue) {
              const now = new Date();

              // Create a new date with the same day/month/year as currentDay but with the current time
              const newDate = setHours(
                setMinutes(
                  setSeconds(
                    setMilliseconds(
                      new Date(currentDay),
                      now.getMilliseconds(),
                    ),
                    now.getSeconds(),
                  ),
                  now.getMinutes(),
                ),
                now.getHours(),
              );

              const result = addChecklistRecord({
                checklistId: checklist.id,
                checklistTemplateId: checklistTemplate.id,
                createdAt: newDate.toISOString(),
                // A field the user never touched stays `undefined` in
                // fieldRecord (see getEmptyFieldRecord) — sending it anyway
                // fails the *whole* submission, since the server validates
                // every record and rejects the first one with no value
                // ("Missing value.") rather than skipping it. Groups with
                // several fields (e.g. an AI-generated one) are commonly
                // only partly filled in per submission, so this has to be a
                // real filter, not a hard requirement to fill every field.
                records: Object.entries(fieldRecord)
                  .filter(([, value]) => value !== undefined)
                  .map(([key, value]) => ({
                    fieldId: key,
                    value: value as number,
                  })),
              });
              // Each touched note field becomes its own new entry — a `type: 'note'` field's
              // Submit is otherwise the exact same shape as a metric field's (see
              // ChecklistFieldGeneral's own comment): never updates an earlier one.
              const noteResults = touchedNoteFields
                .map(({ field, value }) =>
                  addChecklistFieldNote(
                    field.id,
                    value,
                    checklist.id,
                    checklistTemplate.id,
                    noteFieldTitles[field.id] ?? '',
                  ),
                )
                .filter((record): record is ChecklistRecord => !!record);
              setCurrentChecklistRecords([
                ...(result ?? []),
                ...noteResults,
                ...currentChecklistRecords,
              ]);
              setFieldRecord(getEmptyFieldRecord());
              setNoteFieldTitles({});
              setNewNoteKey(v4());
              onSubmit?.();
            }
          }}
        >
          Submit
        </Button>
      </div>
        {currentChecklistRecords.length > 0 ? (
          <>
            <Hr classes={{ hr: styles.hr }} />
            {renderCurrentDay()}
          </>
        ) : (
          <>
            {renderEmpty()}
          </>
        )}

        {/* History Section Header */}
        <div className={styles.historyHeader} onClick={() => setShowHistory(!showHistory)}>
          <div className={styles.historyHeaderContent}>
            <Icon icon="solar:history-3-outline" width={20} />
            <Typography.Title level={5} noMargin>
              History
            </Typography.Title>
          </div>
          <Icon
            icon="solar:alt-arrow-down-outline"
            width={16}
            className={`${styles.arrowIcon} ${showHistory ? styles.arrowExpanded : ''}`}
          />
        </div>

        {showHistory && (
          <div className={styles.historyContent}>
            <ChecklistFieldGroupHistory
              checklistTemplate={checklistTemplate}
              fields={fields}
            />
          </div>
        )}
    </>
  );
};
export default ChecklistFieldGroupAdd;
