import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Icon from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';

import { Checklist, ChecklistTemplate } from '@dreamer/global';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { isToday } from 'date-fns';

import styles from './index.module.scss';
import NoteEditor from '../note/NoteEditor/';
import { useIntl } from '@dreamer/translation';

type Props = {
  checklistTemplate: ChecklistTemplate;
  checklist: Checklist;
  fields: RecordField[];
  fieldGroup: unknown;
  currentDay: string;
};

const ChecklistFieldGroupView = ({
  checklistTemplate,
  fields,
  currentDay,
  fieldGroup,
}: Props) => {
  // const intl = useIntl();
  // const { getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    ChecklistRecord[]
  >([]);
  // const reloadChecklistRecord = () => {
  //   const records = getChecklistRecords(checklistTemplate.id, {
  //     rangeDate: {
  //       from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
  //       to: new Date(
  //         new Date(currentDay).setHours(23, 59, 59, 999),
  //       ).toISOString(),
  //     },
  //     fieldIds: fields.map(field => field.id),
  //     sortDirection: 'desc',
  //   });
  //   setCurrentChecklistRecords(Object.values(records));
  //   return records;
  // };
  // const today = isToday(currentDay);
  // React.useEffect(() => {
  //   reloadChecklistRecord();
  // }, [currentDay]);
  // console.log(">>>>>>>", fieldGroup, currentChecklistRecords)
  // if (currentChecklistRecords.length === 0) {
  //   return null;
  // }

  return (
    <div className={styles.container}>
      <NoteEditor value={fieldGroup.note} readOnly withoutBorder />
    </div>
  );
};
export default ChecklistFieldGroupView;
