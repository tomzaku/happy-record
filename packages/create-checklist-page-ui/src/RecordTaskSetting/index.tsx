import React from 'react';
import List from '@moon-ui/list';
import { Icon } from '@moon-ui/icon/Icon';
import Select from '@moon-ui/select';

import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';
import Checkbox from '@moon-ui/checkbox';
import AddFieldRecordDialog from './AddFieldRecordDialog';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import Typography from '@moon-ui/typography';

const RecordTaskSetting = ({
  selectedRecords = [],
  setSelectedRecords,
}: {
  selectedRecords: string[];
  setSelectedRecords: (records: string[]) => void;
}) => {
  const { getAllRecordFields } = useRecordField();
  const intl = useIntl();
  const [showAddFieldRecord, setShowAddFieldRecord] = React.useState(false);
  const [recordFields, setRecordFields] = React.useState(getAllRecordFields());
  React.useEffect(() => {
    setRecordFields(getAllRecordFields());
  });
  return (
    <div>
      <AddFieldRecordDialog
        visible={showAddFieldRecord}
        onClose={() => setShowAddFieldRecord(false)}
      />
      <Select
        options={recordFields.map(r => ({
          ...r,
          label: r.title,
          value: r.id,
        }))}
        classes={{
          container: styles.selector,
        }}
        renderInput={() => {
          if (selectedRecords.length === 0) {
            return <Typography.Text>Record & Metric</Typography.Text>;
          } else {
            return (
              <div className={styles.resultInput}>
                {selectedRecords.map(id => {
                  const field = recordFields.find(r => r.id === id);
                  return (
                    <div className={styles.selected}>
                      <Typography.Text>{field?.title}</Typography.Text>
                      <Icon
                        icon={'material-symbols:close-rounded'}
                        width={16}
                        height={16}
                        className={styles.closeIcon}
                        onClick={() => {
                          setSelectedRecords(
                            selectedRecords.filter(r => r !== id),
                          );
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          }
        }}
        renderOptionFooter={({ close }) => (
          <div
            onClick={() => {
              setShowAddFieldRecord(true);
              close();
            }}
            className={styles.addCustomField}
          >
            <Typography.Text>
              {intl.formatMessage({
                id: 'label-add-custom-field',
                defaultMessage: 'Add custom field',
              })}
            </Typography.Text>
          </div>
        )}
        onChange={({ id }, { close }) => {
          close();
          const uniqRecords = new Set([...selectedRecords, id]);
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
        const record = recordFields.find(r => r.id === recordKey);
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
