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
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';

type Props = {
  className?: string;
  onSubmit?: (recordField: RecordField) => void;
  recordField: RecordField | null;
};

type FormState = {
  icon: string;
  selectedIconColor: string;
  type: 'metric' | 'note';
  title: string;
  unit: string;
  description: string;
};

const EditFieldRecord = ({ className, onSubmit, recordField }: Props) => {
  const intl = useIntl();
  const { updateRecordField } = useRecordField();

  const [form, setForm] = React.useState<FormState>({
    icon: recordField?.icon || 'octicon:goal-24',
    selectedIconColor: '#607d8b',
    type: recordField?.type || 'metric',
    title: recordField?.title || '',
    unit: recordField?.unit || '',
    description: recordField?.description || '',
  });

  // Update form when recordField changes
  React.useEffect(() => {
    if (recordField) {
      setForm({
        icon: recordField.icon,
        selectedIconColor: '#607d8b', // Default color, could be stored in recordField if needed
        type: recordField.type,
        title: recordField.title,
        unit: recordField.unit,
        description: recordField.description,
      });
    }
  }, [recordField]);

  const handleSubmit = () => {
    if (!recordField) return;

    updateRecordField(recordField.id, {
      icon: form.icon,
      type: form.type,
      title: form.title,
      unit: form.unit,
      description: form.description,
    });

    // Get the updated record field from the store
    const updatedRecordField = {
      ...recordField,
      icon: form.icon,
      type: form.type,
      title: form.title,
      unit: form.unit,
      description: form.description,
    };

    onSubmit?.(updatedRecordField);
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
      <IconPicker
        selectedIcon={form.icon}
        setSelectedIcon={icon => setForm({ ...form, icon })}
        selectedColor={form.selectedIconColor}
        setSelectedColor={color =>
          setForm({ ...form, selectedIconColor: color })
        }
      />
      <div className={styles.addFieldButtonContainer}>
        <Button block size="lg" type="primary" onClick={handleSubmit}>
          {intl.formatMessage({
            defaultMessage: 'Update',
            id: 'label-record-custom.update',
          })}
        </Button>
      </div>
    </div>
  );
};

export default EditFieldRecord;
