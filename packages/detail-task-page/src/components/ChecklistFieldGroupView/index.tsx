import React from 'react';
import { useFieldGroupNote, useFieldGroups, type FieldGroup } from '@dreamer/global';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Chart from 'react-apexcharts';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { useMetricRecordField } from '../ChecklistFieldMetric/useMetricRecordField';

import styles from './index.module.scss';
import NoteEditor from '@moon-ui/note-editor';
import Icon from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import Skeleton from '@moon-ui/skeleton';

type Props = {
  fieldGroup: FieldGroup;
  /** Whether this caller owns the checklist template this group belongs to — a participant edits
   * their own copy of this group's note instead of the owner's, and gets the Original/Mine
   * switcher below (only once they actually have one — see useFieldGroupNote's own comment). */
  isOwner: boolean;
  /** This group's own fields — used only for the small "this month" metric strip at top (see
   * MetricGlance below); the full break-down with a month/year picker still lives on the group's
   * own Metric tab (ChecklistFieldMetric). */
  fields: RecordField[];
  checklistTemplateId: string;
};

/** A small "how's this month going" glance at the top of the Home tab, so a numeric field group
 * doesn't need a tab switch just to see its current total — stats on the left, a mini bar chart
 * on the right. Reuses the Metric tab's own hook rather than a second data pipeline; no
 * month/year picker here on purpose, that's what the full Metric tab is still for. Renders
 * nothing for a group with no number fields — there's nothing to chart. */
const MetricGlance = ({ fields, checklistTemplateId }: { fields: RecordField[]; checklistTemplateId: string }) => {
  const intl = useIntl();
  const { series, options, total, currentStreak } = useMetricRecordField({ checklistTemplateId, fields });
  const hasNumberField = fields.some(field => field.type === 'number');
  const hasData = series.some(s => (s.data ?? []).length > 0);
  if (!hasNumberField || !hasData) return null;

  return (
    <div className={styles.metricGlance}>
      <div className={styles.metricStats}>
        <Typography.Title level={3} noMargin className={styles.metricTotal}>
          {total}
        </Typography.Title>
        <Typography.Text className={styles.metricSub}>
          {intl.formatMessage({ id: 'ChecklistFieldGroupView.metric-this-month', defaultMessage: 'This month' })}
        </Typography.Text>
        <Typography.Text className={styles.metricSub}>
          {intl.formatMessage(
            { id: 'ChecklistFieldGroupView.metric-streak', defaultMessage: '🔥 {{days}}-day streak' },
            { days: currentStreak },
          )}
        </Typography.Text>
      </div>
      <div className={styles.metricChart}>
        <Chart
          options={{
            ...options,
            chart: { ...options.chart, sparkline: { enabled: true } },
            tooltip: { enabled: false },
          }}
          series={series}
          type="bar"
          height={44}
          width="100%"
        />
      </div>
    </div>
  );
};

/** The group's own note only — a `type: 'note'` field's own value is a checklist journal entry
 * now (see ChecklistFieldGeneral's own comment), rendered on the Submit/History tabs alongside
 * the other fields, not here. */
const ChecklistFieldGroupView = ({ fieldGroup, isOwner, fields, checklistTemplateId }: Props) => {
  const { updateFieldGroup } = useFieldGroups();
  // View mode by default — editable only once the user asks for it via the Edit button. Reset
  // to view whenever a different group's note is shown (e.g. switching field groups) rather
  // than leaving a stale edit session open on content that's no longer this group's.
  const [isEditing, setIsEditing] = React.useState(false);
  // A participant lands on the original by default every time — most participants never edit
  // this at all, so there's rarely anything of their own to default back to instead. The
  // Original/Mine tabs themselves only ever show once a personal copy actually exists (see the
  // render below); this is just which one is selected once they do.
  const [view, setView] = React.useState<'public' | 'personal'>('public');
  React.useEffect(() => {
    setIsEditing(false);
    setView('public');
  }, [fieldGroup.id]);

  const { note, loading, hasPersonalCopy, startEditing, save, isPro, generate } = useFieldGroupNote(
    fieldGroup,
    isOwner,
    view,
    newNoteId => updateFieldGroup({ ...fieldGroup, noteId: newNoteId }),
  );

  // The original is only ever editable for its own owner, or for a participant who has no copy of
  // their own *yet* — clicking Edit right there is what makes one (see handleEditClick). Once a
  // participant has their own copy, the original locks read-only for good and Mine is the only
  // place left to edit.
  const editLocked = !isOwner && view === 'public' && hasPersonalCopy;

  const selectTab = (next: 'public' | 'personal') => {
    setView(next);
    setIsEditing(false);
  };

  const handleEditClick = async () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    // First edit ever, as a participant: make their own copy now, then land on it already in
    // edit mode — `startEditing` is a no-op past this point (once `hasPersonalCopy` is true).
    await startEditing();
    if (!isOwner) setView('personal');
    setIsEditing(true);
  };

  return (
    <div className={styles.container}>
      <MetricGlance fields={fields} checklistTemplateId={checklistTemplateId} />
      {!isOwner && hasPersonalCopy && (
        <div className={styles.tabRow}>
          <button
            type="button"
            className={styles.tabPill}
            data-active={view === 'public'}
            onClick={() => selectTab('public')}
          >
            Original
          </button>
          <button
            type="button"
            className={styles.tabPill}
            data-active={view === 'personal'}
            onClick={() => selectTab('personal')}
          >
            Mine
          </button>
        </div>
      )}
      {!loading && (
        <div className={styles.toolbar}>
          {!editLocked && (
            <Button
              type="dash"
              size="sm"
              className={styles.editButton}
              onClick={handleEditClick}
            >
              <Icon
                width={14}
                icon={isEditing ? 'material-symbols:check' : 'solar:pen-2-line-duotone'}
              />
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          )}
        </div>
      )}
      {/* `note.value` is real Editor.js OutputData ({ time, blocks, version }) — see
          useNote.tsx/noteApi.ts — not a Yoopta document; @moon-ui/note-editor's real export
          renders EditorJs.tsx (@editorjs/editorjs); YooptaEditor.tsx in that package is a dead,
          unwired alternate. */}
      {/* No title input here — a note's title is derived server-side from its own content when
          none is given (see _shared/notes.ts's deriveTitle), not typed in. */}
      {loading ? (
        // A few shimmering lines stand in for the paragraphs about to land — same idea
        // note-manager-page-ui's own NoteEditorPane uses for this exact fetch. Reads as "content
        // is coming" instead of a bare spinner off in the toolbar corner with nothing below it.
        <div className={styles.editorSkeleton}>
          <Skeleton width="92%" height={14} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="78%" height={14} />
        </div>
      ) : (
        <>
          {/* Keyed on the actual note being shown — EditorJs.tsx only ever reads `value` at
              construction time (see its own comment), so switching to a genuinely different note
              (Original vs. Mine, or the moment a fork gets created) needs a real remount to
              display the right content, not a prop update it would silently ignore. */}
          <NoteEditor
            key={note?.id ?? 'empty'}
            value={note?.value}
            setValue={save}
            readOnly={editLocked || !isEditing}
            withoutBorder
            ai={{ isPro, generate }}
          />
        </>
      )}
    </div>
  );
};
export default ChecklistFieldGroupView;
