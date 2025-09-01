import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Checklist,
  ChecklistTemplate,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { DesktopDrawer } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';
import FocusZoneModal from '@dreamer/focus-zone-modal-ui';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';
import styles from './index.desktop.module.scss';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import Card from '@moon-ui/card';

const DetailTaskPageDesktop = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getRecordFields } = useRecordField();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  const [checklistTemplate, setChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [fields, setFields] = React.useState<RecordField[]>([]);

  // Focus Zone Modal state
  const [isFocusZoneOpen, setIsFocusZoneOpen] = useState(false);

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
  if (!checklistId || !checklist || !checklistTemplate) {
    return null;
  }

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={styles.desktopBody}>
        <div className={styles.content}>
          {/* Header Section */}
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <Icon
                width={32}
                icon={checklistTemplate.avatar?.name || 'solar:settings-linear'}
                color={checklistTemplate.avatar?.color || '#607d8b'}
              />
              <div className={styles.titleInfo}>
                <Typography.Title level={2} className={styles.pageTitle}>
                  {checklistTemplate.title}
                </Typography.Title>
                <Typography.Text className={styles.subtitle}>
                  Task Details
                </Typography.Text>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Button
                type="ghost"
                onClick={() => {
                  setIsFocusZoneOpen(true);
                }}
                className={styles.actionButton}
              >
                <Icon icon="material-symbols:psychology" width={20} />
                Focus Zone
              </Button>
              <Button
                type="ghost"
                onClick={() => {
                  navigate(`/edit-checklist/${id}`);
                }}
                className={styles.actionButton}
              >
                <Icon icon="solar:pen-new-square-linear" width={20} />
                Edit Task
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className={styles.mainContent}>
            <div className={styles.leftColumn}>
              <Card className={styles.infoCard}>
                <ChecklistGenericInfo
                  checklistTemplate={checklistTemplate}
                  onUpdate={(updatedTemplate) => {
                    updateChecklistTemplate(updatedTemplate);
                    setChecklistTemplate(updatedTemplate);
                  }}
                />
              </Card>
            </div>
            
            <div className={styles.rightColumn}>
              <Card className={styles.fieldsCard}>
                <div className={styles.fieldsHeader}>
                  <Typography.Title level={4} className={styles.fieldsTitle}>
                    Task Fields
                  </Typography.Title>
                  <Typography.Text className={styles.fieldsDescription}>
                    Record your progress and notes for this task
                  </Typography.Text>
                </div>
                <ChecklistFieldGroup
                  checklist={checklist}
                  checklistTemplate={checklistTemplate}
                  fields={fields}
                  currentDay={currentDay}
                />
              </Card>
            </div>
          </div>
        </div>
      </div>

      <FocusZoneModal
        visible={isFocusZoneOpen}
        taskId={id}
        taskTitle={checklistTemplate?.title}
        onDismiss={() => setIsFocusZoneOpen(false)}
        onOpenModal={() => setIsFocusZoneOpen(true)}
      />
    </div>
  );
};

export default DetailTaskPageDesktop;
