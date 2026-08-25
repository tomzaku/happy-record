import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Checklist,
  checklistInstanceId,
  useChallenge,
  useChecklist,
  useChecklistTemplates,
  useSession,
  useSyncedSelector,
} from '@dreamer/global';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { DesktopDrawer } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';
import CardShare from './components/CardShare';
import AiChecklistGenerate from './components/AiChecklistGenerate';
import styles from './index.desktop.module.scss';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import { Link } from 'react-router-dom';

const DetailTaskPageDesktop = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getAllRecordFields } = useRecordField();
  const { getChallengeForTemplate } = useChallenge();
  const { userId } = useSession();
  const intl = useIntl();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  // Derived straight from each store's own function every render (see
  // useSyncedSelector) instead of snapshotted into local state from an
  // effect — a template/field synced in from another device now actually
  // shows up here instead of only refreshing when `id` itself changes.
  const checklistTemplate = useSyncedSelector(getChecklistTemplate, id ?? '');
  const fields = useSyncedSelector(getAllRecordFields);
  // Joining a challenge never forks the template (see CLAUDE.md) — a
  // participant's local copy is the owner's exact row, so this page needs
  // to tell "mine" from "one I joined" itself, rather than assuming
  // whatever's in the local store is always editable.
  const challenge = getChallengeForTemplate(id);
  const isOwner = !challenge || challenge.ownerId === userId;
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState('');
  const [isAiModalVisible, setIsAiModalVisible] = React.useState(false);

  if (!id || !currentDay) {
    return;
  }

  // Load or create checklist. `addChecklist` and `setSearchParams` are
  // deliberately not in the deps array: `addChecklist` is a useCallback
  // whose own identity changes with the `checklist` store it writes to, so
  // including it would refire this effect (and re-create a checklist)
  // every time this very call succeeds. `getChecklistDetail` IS included —
  // its identity changes with that same store, but purely as a read, so a
  // checklist completed/edited on another device now refreshes this page's
  // own copy instead of only refreshing when `checklistId` changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    // TEMP DEBUG — remove once #185 repro is found.
    console.log('[debug185] desktop create-or-load effect fired', {
      checklistId,
      hasChecklistTemplate: !!checklistTemplate,
      id,
      currentDay,
    });
    if (!checklistTemplate) return;

    if (checklistId) {
      const checklist = getChecklistDetail(checklistId);
      console.log('[debug185] desktop READ branch', { checklistId, found: !!checklist });
      setChecklist(checklist);
    } else {
      console.log('[debug185] desktop ADD branch (checklistId falsy)', { checklistId });
      // Should create checklist id if non exist. A deterministic id (see
      // checklistInstanceId) instead of a fresh random one: this effect
      // re-running before its own setSearchParams below has landed (a
      // remount, React Strict Mode's dev double-invoke) upserts the same
      // row instead of minting a duplicate — see useChecklists.tsx's own
      // comment on the same fix for the home page's checkbox.
      const checklist = addChecklist({
        id: checklistInstanceId(id, new Date(currentDay)),
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
  }, [checklistTemplate, checklistId, id, currentDay, getChecklistDetail]);

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
                    {isOwner && (
                      <Button
                        type="ghost"
                        size="sm"
                        onClick={handleEditTitle}
                        className={styles.editTitleButton}
                        title={intl.formatMessage({ id: 'DetailTaskPage.edit-title', defaultMessage: 'Edit Title' })}
                      >
                        <Icon icon="solar:pen-new-square-linear" width={16} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {isOwner && (
              <div className={styles.headerActions}>
                <Button
                  type="ghost"
                  onClick={() => setIsAiModalVisible(true)}
                  className={styles.actionButton}
                >
                  <Icon icon="solar:magic-stick-3-bold-duotone" width={20} />
                  {intl.formatMessage({ id: 'DetailTaskPage.generate-with-ai', defaultMessage: 'Generate with AI' })}
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
            )}
          </div>

          {/* Main Content */}
          <div className={styles.mainContent}>
            <div className={styles.main}>
              <ChecklistFieldGroup
                checklist={checklist}
                checklistTemplate={checklistTemplate}
                fields={fields}
                currentDay={currentDay}
                onUpdateChecklistTemplate={
                  isOwner ? updatedTemplate => updateChecklistTemplate(updatedTemplate) : () => {}
                }
              />
            </div>
            <div className={styles.side}>
              <ChecklistGenericInfo
                isDefaultCollapsed={false}
                checklistTemplate={checklistTemplate}
                onUpdate={isOwner ? updatedTemplate => updateChecklistTemplate(updatedTemplate) : () => {}}
              />

              {isOwner ? (
                <CardShare checklistTemplate={checklistTemplate} />
              ) : (
                challenge && (
                  <Link to={`/challenge/${challenge.id}`} className={styles.challengeLink}>
                    {intl.formatMessage({
                      id: 'DetailTaskPage.view-challenge-dashboard',
                      defaultMessage: 'Part of a challenge — View Dashboard',
                    })}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <AiChecklistGenerate
        visible={isAiModalVisible}
        onDismiss={() => setIsAiModalVisible(false)}
        mode="existing"
        existingTemplate={checklistTemplate}
      />

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
