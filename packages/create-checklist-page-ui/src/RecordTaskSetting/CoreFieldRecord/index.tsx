import React from 'react';
import List from '@moon-ui/list';
import Input from '@moon-ui/input';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import cx from 'classnames';
import IconPicker from '../../IconPicker';
import Select from '@moon-ui/select';

export type FieldType = 'number' | 'note' | 'text' | 'date' | 'datetime';

export type FormState = {
  icon: string;
  selectedIconColor: string;
  type: FieldType;
  title: string;
  unit: string;
  description: string;
  /** number-only — pre-fills the daily submit screen's input for this field. */
  defaultValue?: number;
};

type Props = {
  className?: string;
  initialValues?: Partial<FormState>;
  onSubmit?: (form: FormState) => void;
  onCancel?: () => void;
  submitButtonText?: string;
};

// A row's icon in the same rounded badge the Select Fields list uses for its own field rows
// (ChecklistFieldGroupMenu.module.scss's `.fieldIconBadge`) — this form is the thing that list's
// own "Add Field" button opens, so its rows read as more of the same picker rather than a
// visually separate old-style form bolted on next to it.
const RowIcon = ({ icon }: { icon: string }) => (
  <div className={styles.rowIconBadge}>
    <Icon width={18} icon={icon} />
  </div>
);

const CoreFieldRecord = ({
  className,
  initialValues = {},
  onSubmit,
  onCancel,
  submitButtonText,
}: Props) => {
  const intl = useIntl();

  // A Select dropdown, not the segmented Radio buttons this used to be — 5 options ("Number",
  // "Note", "Short Text", "Date", "Date & Time") don't fit as inline buttons in this row on
  // mobile the way 2 did.
  const typeOptions: { label: string; value: FieldType }[] = [
    { label: intl.formatMessage({ defaultMessage: 'Number', id: 'label-record-custom.type.number' }), value: 'number' },
    { label: intl.formatMessage({ defaultMessage: 'Note', id: 'label-record-custom.type.note' }), value: 'note' },
    { label: intl.formatMessage({ defaultMessage: 'Short Text', id: 'label-record-custom.type.text' }), value: 'text' },
    { label: intl.formatMessage({ defaultMessage: 'Date', id: 'label-record-custom.type.date' }), value: 'date' },
    { label: intl.formatMessage({ defaultMessage: 'Date & Time', id: 'label-record-custom.type.datetime' }), value: 'datetime' },
  ];

  const [form, setForm] = React.useState<FormState>({
    icon: 'octicon:goal-24',
    selectedIconColor: '#607d8b',
    type: 'number',
    title: '',
    unit: '',
    description: '',
    ...initialValues,
  });

  // Form is already initialized with initialValues in useState above
  // No need for useEffect to sync since it's already handled in the initial state

  const handleSubmit = () => {
    onSubmit?.(form);
  };

  return (
    <div className={cx(styles.container, className)}>
      {/* One bordered card, one divider per row — same shell as the Select Fields list this
          opens from, rather than a loose stack of labels with no visual grouping. */}
      <div className={styles.formCard}>
        <div className={styles.formRow}>
          <List.ItemMeta
            noPaddingHorizontal
            className={styles.itemMeta}
            logo={<RowIcon icon="solar:text-field-linear" />}
            title={intl.formatMessage({
              defaultMessage: 'Field Name',
              id: 'label-record-custom.name.label',
            })}
            description={intl.formatMessage({
              defaultMessage: 'Ex: Push-ups, Squats',
              id: 'label-record-custom.name.description',
            })}
          />
          <Input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Enter your field name"
            border="dash"
            className={styles.rowInput}
          />
        </div>

        <div className={styles.formRow}>
          <List.ItemMeta
            noPaddingHorizontal
            className={styles.itemMeta}
            logo={<RowIcon icon="solar:info-circle-bold" />}
            title={intl.formatMessage({
              defaultMessage: 'Description',
              id: 'label-record-custom.description.label',
            })}
          />
          <Input
            value={form.description}
            border="dash"
            placeholder="More information of the field"
            className={styles.rowInput}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* No "Public" toggle after this anymore — a field a user creates can never become
            usable in someone else's checklist template through this form (see _shared/fields.ts's
            own comment on why: only a migration, run as admin, can seed a genuinely public
            field). Sharing a checklist template resolves its own fields a different way (GET
            /fields?templateId=), without ever touching this column. So the "last row, no bottom
            border" styling now lands on whichever row is actually last: Default Value for a
            number field, Type itself for every other type (no unit/default-value rows to
            follow any of them). */}
        <div className={cx(styles.formRow, form.type !== 'number' && styles.formRowLast)}>
          <List.ItemMeta
            noPaddingHorizontal
            className={styles.itemMeta}
            logo={<RowIcon icon="solar:box-minimalistic-outline" />}
            title={intl.formatMessage({
              defaultMessage: 'Type',
              id: 'label-record-custom.type.label',
            })}
            rightComponent={
              <Select
                options={typeOptions}
                value={form.type}
                onChange={({ value }, { close }) => {
                  setForm({ ...form, type: value });
                  close();
                }}
                classes={{
                  container: styles.typeSelectContainer,
                  selectElement: styles.typeSelectElement,
                  input: styles.typeSelectInput,
                }}
              />
            }
          />
        </div>

        {form.type === 'number' && (
          <div className={styles.formRow}>
            <List.ItemMeta
              noPaddingHorizontal
              className={styles.itemMeta}
              logo={<RowIcon icon="lsicon:number-filled" />}
              title={intl.formatMessage({
                defaultMessage: 'Field Unit',
                id: 'label-record-custom.unit.label',
              })}
              description={intl.formatMessage({
                defaultMessage: 'Ex: minutes, hours, reps, kg',
                id: 'label-record-custom.unit.description',
              })}
            />
            <Input
              value={form.unit}
              border="dash"
              onChange={e => setForm({ ...form, unit: e.target.value })}
              className={styles.rowInput}
              placeholder=""
            />
          </div>
        )}

        {form.type === 'number' && (
          <div className={cx(styles.formRow, styles.formRowLast)}>
            <List.ItemMeta
              noPaddingHorizontal
              className={styles.itemMeta}
              logo={<RowIcon icon="solar:target-linear" />}
              title={intl.formatMessage({
                defaultMessage: 'Default Value',
                id: 'label-record-custom.default-value.label',
              })}
              description={intl.formatMessage({
                defaultMessage: 'Pre-fills this field when you submit — still editable, optional',
                id: 'label-record-custom.default-value.description',
              })}
            />
            <Input
              value={form.defaultValue === undefined ? '' : String(form.defaultValue)}
              border="dash"
              type="number"
              onChange={e =>
                setForm({
                  ...form,
                  defaultValue: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className={styles.rowInput}
              placeholder=""
            />
          </div>
        )}
      </div>

      <IconPicker
        selectedIcon={form.icon}
        setSelectedIcon={icon => setForm({ ...form, icon })}
        selectedColor={form.selectedIconColor}
        setSelectedColor={color =>
          setForm({ ...form, selectedIconColor: color })
        }
      />
      <div className={styles.addFieldButtonContainer}>
        {onCancel && (
          <Button
            block
            size="lg"
            type="ghost"
            onClick={onCancel}
            className={styles.cancelButton}
          >
            {intl.formatMessage({
              defaultMessage: 'Cancel',
              id: 'label-cancel',
            })}
          </Button>
        )}
        <Button block size="lg" type="primary" onClick={handleSubmit}>
          {submitButtonText ||
            intl.formatMessage({
              defaultMessage: 'Save',
              id: 'label-record-custom.save',
            })}
        </Button>
      </div>
    </div>
  );
};

export default CoreFieldRecord;
