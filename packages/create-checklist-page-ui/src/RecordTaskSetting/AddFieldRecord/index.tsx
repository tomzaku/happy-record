import React from 'react';
import List from '@moon-ui/list';
import Input from '@moon-ui/input';
import Typography from '@moon-ui/typography';
import { Icon } from '@iconify/react';
import Button from '@moon-ui/button/src/DefaultButton';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import cx from 'classnames';
import IconPicker from '../../IconPicker';
import Select from '@moon-ui/select';
import Radio from '@moon-ui/radio';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { description } from '@moon-ui/typography/src/Paragraph.module.scss';

type Props = {
  className?: string;
  onSubmit?: () => void;
};

type FormState = {
  icon: string;
  selectedIconColor: string;
  type: 'metric' | 'note';
  title: string;
  unit: string;
  description: string;
};

const AddFieldRecord = ({ className, onSubmit }: Props) => {
  const intl = useIntl();
  const [form, setForm] = React.useState<FormState>({
    icon: 'octicon:goal-24',
    selectedIconColor: '#607d8b',
    type: 'metric',
    title: '',
    unit: '',
    description: '',
  });
  const { addRecordField } = useRecordField();
  return (
    <div className={cx(className)}>
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:text-field-linear" />}
        title={intl.formatMessage({
          defaultMessage: 'Field Name',
          id: 'label-record-custom.name.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Ex: Push-ups, Squats',
          id: 'label-record-custom.name.description',
        })}
        rightComponent={
          <Input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            border="dash"
            className={styles.customeFieldInput}
          />
        }
      />
      <List.ItemMeta
        logo={
          <Icon value={form.unit} width={24} icon="solar:text-field-linear" />
        }
        title={intl.formatMessage({
          defaultMessage: 'Field Unit',
          id: 'label-record-custom.unit.label',
        })}
        description={intl.formatMessage({
          defaultMessage: 'Ex: minutes, hours, reps, kg',
          id: 'label-record-custom.unit.description',
        })}
        rightComponent={
          <Input
            border="dash"
            onChange={e => setForm({ ...form, unit: e.target.value })}
            className={styles.customeFieldInput}
          />
        }
      />
      <List.ItemMeta
        logo={<Icon width={24} icon="solar:text-field-linear" />}
        title={intl.formatMessage({
          defaultMessage: 'Type',
          id: 'label-record-custom.type.label',
        })}
        // description={intl.formatMessage({
        //   defaultMessage: '',
        //   id: 'label-record-custom.type.description',
        // })}
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
      <IconPicker
        selectedIcon={form.icon}
        setSelectedIcon={icon => setForm({ ...form, icon })}
        selectedColor={form.selectedIconColor}
        setSelectedColor={color =>
          setForm({ ...form, selectedIconColor: color })
        }
      />
      <div className={styles.addFieldButtonContainer}>
        <Button
          block
          size="lg"
          type="primary"
          onClick={() => {
            addRecordField(form);
            onSubmit?.();
          }}
        >
          {intl.formatMessage({
            defaultMessage: 'Save',
            id: 'label-record-custom.save',
          })}
        </Button>
      </div>
    </div>
  );
};

export default AddFieldRecord;
