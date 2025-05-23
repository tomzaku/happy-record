import React from 'react';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import { Icon } from '@iconify/react';

import { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { useChecklistTemplates } from '@dreamer/global';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const RecordDayView = ({
  id,
  records,
}: {
  id: string;
  records: Record<string, ChecklistRecord[]>;
}) => {
  const { getRecordFields } = useRecordField();
  const [currentRecordFields, setCurrentRecordFields] = React.useState<
    RecordField[]
  >([]);
  const { getChecklistTemplate } = useChecklistTemplates();
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    const currentRecordFields = getRecordFields(checklistTemplate?.records);
    setCurrentRecordFields(currentRecordFields);
  }, []);
  return (
    <div>
      {Object.values(currentRecordFields).map((record, index) => {
        return (
          <List.ItemMeta
            logo={<Icon width={24} icon={record.icon} />}
            title={record.title}
            rightComponent={
              <>
                <Typography.Text>{record.unit}</Typography.Text>
              </>
            }
          />
        );
      })}
    </div>
  );
};

export default RecordDayView;
