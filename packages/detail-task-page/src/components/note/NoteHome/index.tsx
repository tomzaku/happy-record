import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import Typography from '@moon-ui/typography';

const NoteHome = ({
  currentDay,
  checklistId,
  checklistTemplateId,
  fields,
}: {
  currentDay: string;
  checklistId: string;
  checklistTemplateId: string;
  fields: RecordField[];
}) => {
  const { getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    ChecklistRecord[]
  >([]);
  const reloadChecklistRecord = () => {
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
        to: new Date(
          new Date(currentDay).setHours(23, 59, 59, 999),
        ).toISOString(),
      },
      fieldIds: fields.map(field => field.id),
    });
    setCurrentChecklistRecords(Object.values(records));
    return records;
  };
  React.useEffect(() => {
    reloadChecklistRecord();
  }, [checklistTemplateId]);
  return <Typography.Text>Pinned notes will be shown here.</Typography.Text>;
};
export default NoteHome;
