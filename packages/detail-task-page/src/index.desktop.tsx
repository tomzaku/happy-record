import React from 'react';
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
import { useIntl } from '@dreamer/translation';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';
import styles from './index.desktop.module.scss';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';

const DetailTaskPageDesktop = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getAllRecordFields } = useRecordField();
  const intl = useIntl();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  const [checklistTemplate, setChecklistTemplate] =
    React.useState<ChecklistTemplate>();
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [fields, setFields] = React.useState<RecordField[]>([]);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState('');

  if (!id || !currentDay) {
    return;
  }

  // Load checklist template
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    setChecklistTemplate(checklistTemplate);
  }, [id]);

  // Load or create checklist
  React.useEffect(() => {
    if (!checklistTemplate) return;

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
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('checklistId', checklist.id);
        return newParams;
      });
      setChecklist(checklist);
    }
  }, [checklistTemplate, checklistId, id, currentDay]);

  // Update fields when checklistTemplate changes
  React.useEffect(() => {
    if (!checklistTemplate) return;

    // Get all available fields, not just the ones already assigned to groups
    const allFields = getAllRecordFields();
    setFields(allFields);
  }, [checklistTemplate]);

  // Callback for when new fields are added
  const handleFieldAdded = (newField: RecordField) => {
    setFields([...fields, newField]);
  };

  // Handle title editing
  const handleEditTitle = () => {
    if (checklistTemplate) {
      setEditedTitle(checklistTemplate.title);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = () => {
    if (checklistTemplate && editedTitle.trim()) {
      const updatedTemplate = {
        ...checklistTemplate,
        title: editedTitle.trim(),
      };
      updateChecklistTemplate(updatedTemplate);
      setChecklistTemplate(updatedTemplate);
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

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
                {isEditingTitle ? (
                  <div className={styles.titleEditContainer}>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className={styles.titleInput}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className={styles.titleDisplayContainer}>
                    <Typography.Title level={2} className={styles.pageTitle}>
                      {checklistTemplate.title}
                    </Typography.Title>
                    <Button
                      type="ghost"
                      size="sm"
                      onClick={handleEditTitle}
                      className={styles.editTitleButton}
                      title={intl.formatMessage({ id: 'DetailTaskPage.edit-title', defaultMessage: 'Edit Title' })}
                    >
                      <Icon icon="solar:pen-new-square-linear" width={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.headerActions}>
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
            <div className={styles.main}>
              <ChecklistFieldGroup
                checklist={checklist}
                checklistTemplate={checklistTemplate}
                fields={fields}
                currentDay={currentDay}
                onUpdateChecklistTemplate={updatedTemplate => {
                  updateChecklistTemplate(updatedTemplate);
                  setChecklistTemplate(updatedTemplate);
                  // Fields will be updated automatically via useEffect
                }}
                onFieldAdded={handleFieldAdded}
              />
            </div>
            <div className={styles.side}>
              <ChecklistGenericInfo
                isDefaultCollapsed={false}
                checklistTemplate={checklistTemplate}
                onUpdate={updatedTemplate => {
                  updateChecklistTemplate(updatedTemplate);
                  setChecklistTemplate(updatedTemplate);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* <FocusZoneModal */}
      {/*   visible={isFocusZoneOpen} */}
      {/*   taskId={id} */}
      {/*   taskTitle={checklistTemplate?.title} */}
      {/*   onDismiss={() => setIsFocusZoneOpen(false)} */}
      {/*   onOpenModal={() => setIsFocusZoneOpen(true)} */}
      {/* /> */}
    </div>
  );
};

export default DetailTaskPageDesktop;
