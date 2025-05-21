import List from '@moon-ui/list';
import { Icon } from '@iconify/react';
import Select from '@moon-ui/select';

import { useIntl } from '@dreamer/translation';
import AddFieldRecord from './AddFieldRecord';

import styles from './index.module.scss';
import Checkbox from '@moon-ui/checkbox';

const recordList = [
  {
    key: 'duration',
    title: 'Duration',
    icon: 'solar:clock-square-broken',
    description: 'Record duration for tracking purpose',
    type: 'number',
  },
  {
    key: 'push-ups',
    title: 'Push-ups',
    icon: 'solar:text-field-linear',
    description: 'For example: Push-ups, Squats',
    type: 'number',
  },
];

const RecordTaskSetting = ({
  selectedRecords = [],
  setSelectedRecords,
}: {
  selectedRecords: string[];
  setSelectedRecords: (records: string[]) => void;
}) => {
  return (
    <div>
      <Select
        options={recordList.map(r => ({ ...r, label: r.title, value: r.key }))}
        renderInput={() => {
          if (selectedRecords.length === 0) {
            return <div>Selecting</div>;
          } else {
            return (
              <span>
                {selectedRecords.map(key => (
                  <span className={styles.selected}>{key}</span>
                ))}
              </span>
            );
          }
        }}
        value={''}
        onChange={(key, { close }) => {
          close();
          const uniqRecords = new Set([...selectedRecords, key]);
          setSelectedRecords([...uniqRecords]);
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
      {selectedRecords.map(recordKey => {
        const record = recordList.find(r => r.key === recordKey);
        if (!record) return;
        return (
          <List.ItemMeta
            className={styles.selectorCard}
            logo={<Icon width={24} icon={record.icon} />}
            title={record.title}
            description={record.description}
            rightComponent={
              <Checkbox
                checked={true}
                size="lg"
                onClick={() => {
                  setSelectedRecords(
                    selectedRecords.filter(r => r !== recordKey),
                  );
                }}
              />
            }
          />
        );
      })}
      {/* <AddFieldRecord />  */}
    </div>
  );
};

export default RecordTaskSetting;
