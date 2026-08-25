import React from 'react';
import List from '@moon-ui/list';
import Input from '@moon-ui/input';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import cx from 'classnames';
import IconPicker from '../../IconPicker';
import Radio from '@moon-ui/radio';
import Checkbox from '@moon-ui/checkbox';

export type FormState = {
  icon: string;
  selectedIconColor: string;
  type: 'metric' | 'note';
  title: string;
  unit: string;
  description: string;
  visibility: 'public' | 'private';
  /** Metric-only — pre-fills the daily submit screen's input for this field. */
  defaultValue?: number;
};

type Props = {
  className?: string;
  initialValues?: Partial<FormState>;
  onSubmit?: (form: FormState) => void;
  onCancel?: () => void;
  submitButtonText?: string;
};

const CoreFieldRecord = ({
  className,
  initialValues = {},
  onSubmit,
  onCancel,
  submitButtonText,
}: Props) => {
  const intl = useIntl();
  const [form, setForm] = React.useState<FormState>({
    icon: 'octicon:goal-24',
    selectedIconColor: '#607d8b',
    type: 'metric',
    title: '',
    unit: '',
    description: '',
    visibility: 'private',
    ...initialValues,
  });

  // Form is already initialized with initialValues in useState above
  // No need for useEffect to sync since it's already handled in the initial state

  const handleSubmit = () => {
    onSubmit?.(form);
  };

  return (
    <div className={cx(className)}>
      <div className={styles.descriptionContainer}>
        <List.ItemMeta
          noPaddingHorizontal
          className={styles.itemMeta}
          logo={<Icon width={24} icon="solar:text-field-linear" />}
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
          className={styles.descriptionInput}
        />
      </div>
      <div className={styles.descriptionContainer}>
        <List.ItemMeta
          noPaddingHorizontal
          className={styles.itemMeta}
          logo={<Icon width={24} icon="solar:info-circle-bold" />}
          title={intl.formatMessage({
            defaultMessage: 'Description',
            id: 'label-record-custom.description.label',
          })}
        />
        <Input
          value={form.description}
          border="dash"
          placeholder="More information of the field"
          className={styles.descriptionInput}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <List.ItemMeta
        noPaddingHorizontal
        className={styles.marginBottom}
        logo={<Icon width={24} icon="solar:box-minimalistic-outline" />}
        title={intl.formatMessage({
          defaultMessage: 'Type',
          id: 'label-record-custom.type.label',
        })}
        rightComponent={
          <Radio
            isButton
            value={form.type}
            onChangeValue={type => setForm({ ...form, type })}
            options={[
              { label: 'Metric', value: 'metric' },
              { label: 'Note', value: 'note' },
            ]}
          />
        }
      />
      {form.type !== 'metric' ? null : (
        <div className={styles.descriptionContainer}>
          <List.ItemMeta
            noPaddingHorizontal
            className={styles.itemMeta}
            logo={<Icon width={24} icon="lsicon:number-filled" />}
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
            className={styles.descriptionInput}
            placeholder=""
          />
        </div>
      )}
      {form.type !== 'metric' ? null : (
        <div className={styles.descriptionContainer}>
          <List.ItemMeta
            noPaddingHorizontal
            className={styles.itemMeta}
            logo={<Icon width={24} icon="solar:target-linear" />}
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
            className={styles.descriptionInput}
            placeholder=""
          />
        </div>
      )}
      <List.ItemMeta
        noPaddingHorizontal
        className={styles.marginBottom}
        logo={<Icon width={24} icon="solar:users-group-rounded-linear" />}
        title={intl.formatMessage({
          defaultMessage: 'Public',
          id: 'label-record-custom.visibility.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Other users can use this field in their own checklists',
          id: 'label-record-custom.visibility.description',
        })}
        rightComponent={
          <Checkbox
            checked={form.visibility === 'public'}
            onChange={e =>
              setForm({ ...form, visibility: e.target.checked ? 'public' : 'private' })
            }
          />
        }
      />
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
