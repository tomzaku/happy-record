import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import RecordDay from './components/RecordDay';
import {
  Checklist,
  ChecklistTemplate,
  FieldGroup,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import Note from './components/note/Note';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { BackHeader } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import Select from '@moon-ui/select';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';
import { useIntl } from '@dreamer/translation';

const minus1Day = (date: Date) => {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
};
const plus1Day = (date: Date) => {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
};

const DetailTaskPage = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate } = useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getRecordFields } = useRecordField();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  const [checklistTemplate, setChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [fields, setFields] = React.useState<RecordField[]>([]);
  if (!id || !currentDay) {
    return;
  }
  // Update checklistId Params
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    setChecklistTemplate(checklistTemplate);
    if (!checklistTemplate) return;

    const fieldResult = getRecordFields(
      checklistTemplate.fieldGroups
        ?.map(fieldGroup => fieldGroup.fields)
        .flat(),
    );

    setFields(fieldResult);
    if (checklistId) {
      const checklist = getChecklistDetail(checklistId);
      setChecklist(checklist);
    } else {
      // Should create checklist id if non exist
      const checklist = addChecklist({
        title: checklistTemplate.title,
        checklistTemplateId: id,
        startedAt: new Date(currentDay).toISOString(),
        endedAt: new Date(currentDay).toISOString(),
      });
      setSearchParams({
        ...Object.fromEntries(search),
        checklistId: checklist.id,
      });
      setChecklist(checklist);
    }
  }, [checklistId]);

  const navigate = useNavigate();
  const intl = useIntl();
  if (!checklistId || !checklist || !checklistTemplate) {
    return null;
  }
  const isToday =
    new Date(currentDay).toLocaleDateString() ===
    new Date().toLocaleDateString();
  const dateText = isToday
    ? intl.formatMessage({
        id: 'checklist-calendar.today',
        defaultMessage: 'Today',
      })
    : new Date(currentDay).toLocaleDateString();
  return (
    <>
      <BackHeader
        renderLeftComponent={() => <div>{checklistTemplate?.title}</div>}
        renderRightComponent={() => (
          <Icon
            onClick={() => {
              navigate(`/edit-checklist/${id}`);
            }}
            width={24}
            icon="solar:pen-new-square-linear"
          />
        )}
        onClickLeftButton={() => navigate('/')}
      />
      <div className={styles.calendarContainer}>
        <Icon
          width={20}
          onClick={() => {
            setSearchParams({
              ...Object.fromEntries(search),
              currentDay: minus1Day(new Date(currentDay)).toISOString(),
            });
          }}
          icon="basil:skip-prev-outline"
          className={styles.icon}
        />
        <Typography.Text className={styles.dateText}>
          {dateText}
        </Typography.Text>
        <Icon
          width={20}
          icon="basil:skip-next-outline"
          className={styles.icon}
          onClick={() => {
            setSearchParams({
              ...Object.fromEntries(search),
              currentDay: plus1Day(new Date(currentDay)).toISOString(),
            });
          }}
        />
      </div>
      <ChecklistFieldGroup
        checklist={checklist}
        checklistTemplate={checklistTemplate}
        fields={fields}
        currentDay={currentDay}
      />
    </>
  );
};

export default DetailTaskPage;
