import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Icon from '@moon-ui/icon/Icon';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import NoteEditor, { type NoteEditorHandle } from '@moon-ui/note-editor';
import DatePicker from '@moon-ui/date-picker';
import { v4 } from 'uuid';
import cx from 'classnames';

import styles from './index.module.scss';
import {
  dateInputValueToIso,
  datetimeLocalInputValueToIso,
  isoToDatetimeLocalInputValue,
} from '@dreamer/global/src/lib/fieldValueFormat';
import { parseMultiselect, serializeMultiselect } from '@dreamer/global/src/lib/multiselectValue';
import Checkbox from '@moon-ui/checkbox';
import Button from '@moon-ui/button/src/DefaultButton';
import { showToast } from '@moon-ui/toast';
import { Checklist, ChecklistTemplate, FieldGroup, useAiNoteGenerate, useIsMobile } from '@dreamer/global';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import {
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from 'date-fns';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import { useIntl } from '@dreamer/translation';
import WeeklyRow from '../WeeklyRow';
import ChecklistFieldGroupAttachments from './ChecklistFieldGroupAttachments';
import MediaFieldInput, { MediaFieldPreview } from './MediaFieldInput';

type Props = {
  fields: RecordField[];
  checklistTemplate: ChecklistTemplate;
  fieldGroup: FieldGroup;
  checklist: Checklist;
  currentDay: string;
  onSubmit?: () => void;
  // Opens this group's own Select Fields dialog (ChecklistFieldGroupMenu, via
  // ChecklistFieldGroup's ref map) — lets someone filling out the Submit tab jump straight to
  // adding/removing fields without first finding the "⋮" settings menu on the group header.
  onOpenFieldSettings?: () => void;
  /** Hides the week-strip nav (`WeeklyRow`, which reads/writes this *page's own* `currentDay`
   * search param) and the collapsible History section below the fields — both assume they're
   * sitting on the real `/task/:id` page. home-calendar's own `TaskDetailModal` embeds this same
   * component for its calendar quick-look, outside that route entirely: `WeeklyRow`'s week
   * nav would silently rewrite whatever page it's actually mounted on's own query string instead,
   * and History duplicates the calendar already visible behind the modal. Defaults false —
   * unchanged for every existing detail-task-page caller. */
  compact?: boolean;
};

// A number record's `value` can be null/undefined/a non-numeric string —
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
// defined" the way a number field's own `fieldRecord[id] !== undefined` check works. Has to look
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
  compact = false,
}: Props) => {
  // A `type: 'note'` field's own value is a checklist journal entry (see ChecklistFieldGeneral's
  // own comment) — one new note per Submit click, same shape a number field's own record already
  // has. `fields` here is still this whole group's list (used elsewhere for override merging),
  // so this component splits it itself rather than assuming the caller already did.
  const numberFields = fields.filter(field => field.type === 'number');
  const noteFields = fields.filter(field => field.type === 'note');
  // 'text'/'date'/'datetime' all share one plain-string state bucket (textFieldRecord below) and
  // one Submit shape — only the input control differs per type (see the render below).
  const textLikeFields = fields.filter(
    field => field.type === 'text' || field.type === 'date' || field.type === 'datetime',
  );
  // 'select'/'multiselect' share that exact same bucket too — a select's own value is a plain
  // string (the chosen option), a multiselect's is a JSON-encoded array in that same string slot
  // (see lib/multiselectValue.ts) — so both submit through the exact same `textFieldRecord`/
  // `textEntries` machinery below, just with a list-of-options picker instead of a single-line
  // input rendered separately further down (a tall options list doesn't fit `rightComponent` the
  // way a compact Input/DatePicker does).
  const selectLikeFields = fields.filter(
    field => field.type === 'select' || field.type === 'multiselect',
  );
  // A photo/video field's own value is a `media` row's own id — a plain string exactly like
  // text/date/datetime's own value already is (see RecordField.type's own comment), so it shares
  // that same `textFieldRecord` state and `textEntries` submission bucket below rather than
  // needing its own — only the *input control* (MediaFieldInput, an upload/capture UI instead of
  // a text/date input) and the read-only display (MediaFieldPreview instead of
  // formatFieldValueForDisplay) actually differ.
  const mediaFields = fields.filter(field => field.type === 'photo' || field.type === 'video');
  // Pre-fills a number field's own default value (set via the Edit Field
  // form — see CoreFieldRecord) instead of always starting blank; still
  // fully editable, and a field with no default set stays blank exactly as
  // before.
  const getEmptyFieldRecord = () => {
    return numberFields.reduce(
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
  // Same "untouched stays undefined, filtered out at Submit" shape fieldRecord uses for number
  // fields — a text/date/datetime field has no default-value concept (CoreFieldRecord only ever
  // shows that input for type: 'number'), so this always starts empty.
  const [textFieldRecord, setTextFieldRecord] = React.useState<
    Record<string, string | undefined>
  >({});
  // Read directly at Submit time (see hasNoteContent/the onClick handler below) instead of
  // tracked via `setValue` state — Editor.js's own `onChange` is debounced internally (its own
  // MutationObserver handler, not something this component controls), so a keystroke followed
  // immediately by clicking Submit could otherwise beat that debounce and submit stale (or
  // entirely missing) content. `getValue()` (NoteEditorHandle, see @moon-ui/note-editor) asks
  // Editor.js for its real current state instead of trusting whatever was last reported.
  const noteEditorRefs = React.useRef<Record<string, NoteEditorHandle | null>>({});
  // A debounced approximation of the same thing, purely to drive the Submit button's own
  // `disabled` state below — that has to be synchronous (a render can't `await` each note
  // editor's `getValue()` the way the onClick handler does), and a keystroke-old value is fine
  // for "should this button even be clickable," unlike the submit payload itself above.
  const [noteTouched, setNoteTouched] = React.useState<Record<string, boolean>>({});
  const { addChecklistRecord, getChecklistRecords } = useChecklistRecord();
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
  // On mobile, MediaFieldInput renders its own compact "Take Photo"/"Record Video" button (see
  // MediaFieldInput.tsx's own MobileCapture) — small enough to sit in the same right column
  // every other field's own input already uses, instead of the full-width row a desktop
  // drag-and-drop dropzone genuinely needs room for.
  const isMobile = useIsMobile();

  // Whether the Attachments section below is expanded — collapsed by default, toggled only by
  // its own header click.
  const [showHistory, setShowHistory] = React.useState(false);

  const reloadChecklistRecord = () => {
    // `fieldIds: []` means "no filter" to getChecklistRecords (see that hook's own comment),
    // not "match nothing" — has to be guarded rather than always called, or a note-only group
    // would pull back every field's records for this template. Number and note fields both come
    // back from this same call now — checklist-records' own list() merges note-type entries into
    // the same response (see checklist-records/index.ts), so there's no separate note read left.
    const allFieldIds = fields.map(field => field.id);
    const records = allFieldIds.length
      ? getChecklistRecords(checklistTemplate.id, {
        rangeDate: {
          from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
          to: new Date(
            new Date(currentDay).setHours(23, 59, 59, 999),
          ).toISOString(),
        },
        fieldIds: allFieldIds,
        sortDirection: 'desc',
      })
      : {};
    // Flatten the records object into an array
    const flattenedRecords = Object.values(records).flat();
    setCurrentChecklistRecords(flattenedRecords);
    return records;
  };
  const intl = useIntl();
  // `reloadChecklistRecord` has side effects beyond a pure read
  // (`setShowHistory`), so this stays an effect rather than becoming a
  // `useSyncedSelector` — but its deps were missing `checklistTemplate.id`,
  // `fields`, and `getChecklistRecords` itself, so a record submitted on
  // another device (or a field list synced in) never refired this and just
  // sat un-rendered. `getChecklistRecords` is `useCallback`-wrapped against its real store
  // dependency (see useChecklistRecord.ts), so this only actually refires when that changes.
  React.useEffect(() => {
    reloadChecklistRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDay, checklistTemplate.id, fields, getChecklistRecords]);

  // Today's photo/video check-ins only — no field name/icon labels, just the attachments
  // themselves (number/note/text/date/select values already have their own place: the number
  // total on its own input row above, everything else in the group's real submission history).
  const todaysAttachments = currentChecklistRecords.filter(record => {
    const field = fields.find(f => f.id === record.fieldId);
    return field && (field.type === 'photo' || field.type === 'video') && typeof record.value === 'string';
  });
  // The Submit button's own `disabled` gate — same "is anything actually filled in" shape the
  // onClick handler below re-derives for the real submission guard, just synchronous (`noteTouched`
  // instead of an awaited `getValue()` per note field, see its own comment above) since a render
  // can't await anything. A click-time false positive from a note field the user just touched but
  // whose debounced `setValue` hasn't landed yet still can't submit an empty group — the onClick
  // handler's own async check is still the real guard, this is only ever a UX affordance.
  const hasAnyValue =
    Object.values(fieldRecord).some(value => value !== undefined) ||
    Object.values(textFieldRecord).some(value => value !== undefined) ||
    Object.values(noteTouched).some(Boolean);
  return (
    <>
      {!compact && <WeeklyRow currentDay={currentDay} />}
      {numberFields.map(field => {
        // Today's total for this field, same sum renderCurrentDay used to show in its own
        // duplicate row below — rendered outside this row's own List.ItemMeta container
        // (that row's `rightComponent` is only the input; the total sits underneath it,
        // aligned to the bottom right) so it no longer stretches that row's own height and
        // throws off the input's alignment.
        const recordValues = currentChecklistRecords.filter(record => record.fieldId === field.id);
        const sumValue = sum(recordValues.map(record => record.value));
        return (
          <div key={field.id}>
            <List.ItemMeta
              logo={<Icon width={24} icon={field.icon} />}
              title={field.title}
              noPaddingHorizontal={compact}
            />
            <div className={cx(styles.numberFieldRow, compact && styles.numberFieldRowCompact)}>
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
                classes={{ wrapper: styles.input }}
                type="number"
                // Only ever set via a group's own override (see getEffectiveFieldDisplay
                // in ChecklistFieldGroup) — a field has no placeholder of its own.
                placeholder={field.placeholder}
              />
              {recordValues.length > 0 && (
                <Typography.Text className={styles.sumValueText}>
                  {intl.formatMessage(
                    { id: 'checklist-field-group-add.total', defaultMessage: 'Total: {{value}}' },
                    { value: String(sumValue) },
                  )}
                </Typography.Text>
              )}
            </div>
          </div>
        );
      })}
      {noteFields.map(field => (
        <div key={field.id} className={styles.noteField}>
          <List.ItemMeta
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            noPaddingHorizontal={compact}
          />
          {/* No title input here — a note entry's title is derived server-side from its own
              content when none is given (see _shared/notes.ts's deriveTitle), not typed in. */}
          <NoteEditor
            key={`${field.id}-${newNoteKey}`}
            ref={handle => {
              noteEditorRefs.current[field.id] = handle;
            }}
            setValue={value => setNoteTouched(prev => ({ ...prev, [field.id]: hasNoteContent(value) }))}
            withoutBorder
            ai={{ isPro, generate }}
          />
        </div>
      ))}
      {textLikeFields.map(field => (
        <List.ItemMeta
          key={field.id}
          logo={<Icon width={24} icon={field.icon} />}
          title={field.title}
          noPaddingHorizontal={compact}
          rightComponent={
            <>
              {field.type === 'text' && (
                <Input
                  key={`${field.id}-${newNoteKey}`}
                  value={textFieldRecord[field.id] ?? ''}
                  onChange={e =>
                    setTextFieldRecord({ ...textFieldRecord, [field.id]: e.target.value })
                  }
                  border="dash"
                  className={styles.textLikeInput}
                  placeholder={field.placeholder}
                />
              )}
              {field.type === 'date' && (
                <DatePicker
                  key={`${field.id}-${newNoteKey}`}
                  value={textFieldRecord[field.id]}
                  className={styles.textLikeInput}
                  onChange={e => {
                    const iso = dateInputValueToIso(e.target.value);
                    setTextFieldRecord({ ...textFieldRecord, [field.id]: iso });
                  }}
                />
              )}
              {field.type === 'datetime' && (
                <input
                  key={`${field.id}-${newNoteKey}`}
                  type="datetime-local"
                  className={cx(styles.textLikeInput, styles.nativeDateInput)}
                  value={
                    textFieldRecord[field.id]
                      ? isoToDatetimeLocalInputValue(textFieldRecord[field.id]!)
                      : ''
                  }
                  onChange={e => {
                    const iso = datetimeLocalInputValueToIso(e.target.value);
                    setTextFieldRecord({ ...textFieldRecord, [field.id]: iso });
                  }}
                />
              )}
            </>
          }
        />
      ))}
      {selectLikeFields.map(field => {
        const isMulti = field.type === 'multiselect';
        const selected = isMulti
          ? parseMultiselect(textFieldRecord[field.id])
          : textFieldRecord[field.id]
            ? [textFieldRecord[field.id] as string]
            : [];
        const toggle = (option: string) => {
          if (isMulti) {
            const next = selected.includes(option)
              ? selected.filter(o => o !== option)
              : [...selected, option];
            setTextFieldRecord({
              ...textFieldRecord,
              [field.id]: next.length ? serializeMultiselect(next) : undefined,
            });
          } else {
            setTextFieldRecord({ ...textFieldRecord, [field.id]: option });
          }
        };
        return (
          <div key={`${field.id}-${newNoteKey}`} className={styles.selectField}>
            <List.ItemMeta
              logo={<Icon width={24} icon={field.icon} />}
              title={field.title}
              noPaddingHorizontal={compact}
            />
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
          </div>
        );
      })}
      {mediaFields.map(field => {
        const input = (
          <MediaFieldInput
            kind={field.type as 'photo' | 'video'}
            value={textFieldRecord[field.id]}
            onChange={mediaId =>
              setTextFieldRecord({ ...textFieldRecord, [field.id]: mediaId })
            }
          />
        );
        return isMobile ? (
          <List.ItemMeta
            key={`${field.id}-${newNoteKey}`}
            logo={<Icon width={24} icon={field.icon} />}
            title={field.title}
            noPaddingHorizontal={compact}
            rightComponent={input}
          />
        ) : (
          <div key={`${field.id}-${newNoteKey}`} className={styles.mediaField}>
            <List.ItemMeta
              logo={<Icon width={24} icon={field.icon} />}
              title={field.title}
              noPaddingHorizontal={compact}
            />
            {input}
          </div>
        );
      })}
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
          type="plain"
          size="md"
          disabled={!hasAnyValue}
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
            // A touched note field counts too, even with no number value alongside it — same for
            // a touched text/date/datetime field. The real guard, not `hasAnyValue` above (the
            // `disabled` prop's own synchronous approximation) — this one awaits each note
            // editor's actual current content first, so it can't be fooled by a keystroke that
            // hasn't reached `noteTouched` yet.
            const hasAnyValueAtSubmit =
              Object.values(fieldRecord).some(value => value !== undefined) ||
              Object.values(textFieldRecord).some(value => value !== undefined) ||
              touchedNoteFields.length > 0;
            if (checklistTemplate && hasAnyValueAtSubmit) {
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

              // Number entries and touched note entries go in the same `records` array, one
              // `addChecklistRecord` call — checklist-records routes each entry server-side by
              // its own `value` shape (see checklist-records/index.ts's own save()/isNoteEntry),
              // not by anything the client marks explicitly. A touched note field's Submit is
              // otherwise the exact same shape as a number field's: never updates an earlier
              // entry, always a new one. No `title` sent — there's no title input left to fill
              // in (see the noteFields.map above); the server derives one from the content itself
              // when none is given (see _shared/notes.ts's deriveTitle).
              const numberEntries = Object.entries(fieldRecord)
                // A field the user never touched stays `undefined` in
                // fieldRecord (see getEmptyFieldRecord) — sending it anyway
                // fails the *whole* submission, since the server validates
                // every record and rejects the first one with no value
                // ("Missing value.") rather than skipping it. Groups with
                // several fields (e.g. an AI-generated one) are commonly
                // only partly filled in per submission, so this has to be a
                // real filter, not a hard requirement to fill every field.
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => ({
                  fieldId: key,
                  value: value as number,
                }));
              const noteEntries = touchedNoteFields.map(({ field, value }) => ({
                fieldId: field.id,
                value: value as unknown as string,
              }));
              // Same "untouched stays undefined, filtered out" shape numberEntries uses above —
              // a text/date/datetime field is equally fine partly filled in per submission.
              const textEntries = Object.entries(textFieldRecord)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => ({
                  fieldId: key,
                  value: value as string,
                }));

              const result = addChecklistRecord({
                checklistId: checklist.id,
                checklistTemplateId: checklistTemplate.id,
                createdAt: newDate.toISOString(),
                records: [...numberEntries, ...noteEntries, ...textEntries],
              });
              setCurrentChecklistRecords([
                ...(result ?? []),
                ...currentChecklistRecords,
              ]);
              setFieldRecord(getEmptyFieldRecord());
              setTextFieldRecord({});
              setNoteTouched({});
              setNewNoteKey(v4());
              showToast(
                intl.formatMessage({
                  id: 'checklist-field-group-add.submit-success',
                  defaultMessage: 'Record submitted',
                }),
                { variant: 'success' },
              );
              onSubmit?.();
            }
          }}
        >
          Submit
        </Button>
      </div>
        {todaysAttachments.length > 0 && (
          <>
            <Hr classes={{ hr: styles.hr }} />
            <div className={styles.historyBody}>
              {todaysAttachments.map(record => {
                const field = fields.find(f => f.id === record.fieldId);
                if (!field) return null;
                return (
                  <MediaFieldPreview
                    key={record.id}
                    kind={field.type as 'photo' | 'video'}
                    mediaId={record.value as string}
                  />
                );
              })}
            </div>
          </>
        )}

        {!compact && mediaFields.length > 0 && (
          <>
            {/* Attachments Section Header — collapsed by default, no auto-expand */}
            <div className={styles.historyHeader} onClick={() => setShowHistory(!showHistory)}>
              <div className={styles.historyHeaderContent}>
                <Icon icon="solar:gallery-wide-bold-duotone" width={20} />
                <Typography.Title level={5} noMargin>
                  {intl.formatMessage({
                    id: 'checklist-field-group-add.attachments',
                    defaultMessage: 'Attachments',
                  })}
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
                <ChecklistFieldGroupAttachments
                  checklistTemplate={checklistTemplate}
                  fields={mediaFields}
                />
              </div>
            )}
          </>
        )}
    </>
  );
};
export default ChecklistFieldGroupAdd;
