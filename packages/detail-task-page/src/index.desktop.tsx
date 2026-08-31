import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Checklist,
  checklistInstanceId,
  useChallenge,
  useChecklist,
  useChecklistTemplates,
  useIsPro,
  useLeaveChallenge,
  useSession,
  useSyncedSelector,
} from '@dreamer/global';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { Breadcrumb, DesktopDrawer } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';
import CardShare from './components/CardShare';
import AiChecklistGenerate from './components/AiChecklistGenerate';
import MiniChallengeDashboard from './components/MiniChallengeDashboard';
import styles from './index.desktop.module.scss';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import WarningModal from '@moon-ui/modal/src/WarningModal';

const DetailTaskPageDesktop = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate, updateMyReminder, deleteChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getAllRecordFields, getRecordFieldsByTemplateId } = useRecordField();
  const { getChallengeForTemplate } = useChallenge();
  const { leaveTheChallenge } = useLeaveChallenge();
  const { userId } = useSession();
  const { isPro } = useIsPro();
  const intl = useIntl();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  // Derived straight from each store's own function every render (see
  // useSyncedSelector) instead of snapshotted into local state from an
  // effect — a template/field synced in from another device now actually
  // shows up here instead of only refreshing when `id` itself changes.
  const checklistTemplate = useSyncedSelector(getChecklistTemplate, id ?? '');
  // A joined challenge's fields are the owner's own, private rows — `getAllRecordFields` (own +
  // public only) can never resolve them for a participant. This triggers the same `?templateId=`
  // fetch the shared-template page uses (a no-op for the caller's own, still-private template) —
  // see useRecordField.tsx's own comment — merging into the same store `getAllRecordFields` reads.
  useSyncedSelector(getRecordFieldsByTemplateId, id ?? '');
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
  const [leaveModalVisible, setLeaveModalVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  // Guards the "create if missing" branch below against #185: `getChecklistDetail`'s
  // identity changes on *every* write to the `checklist` store (it's a useCallback
  // closed over that store, kept in deps so a checklist edited on another device
  // still refreshes this page — see the effect's own comment). `addChecklist`'s own
  // write is one such change, so once the ADD branch runs, the effect immediately
  // sees a new `getChecklistDetail` identity and re-fires — and if `checklistId`
  // hasn't turned truthy yet by then (`setSearchParams` landing is a separate,
  // not-necessarily-synchronous state update), it takes the ADD branch *again*,
  // creating the same checklist forever: unlike every other store write in this
  // app, `addChecklist` sets a fresh `updatedAt` unconditionally with no "did this
  // actually change" guard, so each iteration is a genuine, unbounded store write
  // — confirmed live via #185's debug logging, `addChecklist` firing dozens of
  // times a second for the same deterministic id until React's nested-update limit
  // throws "Maximum update depth exceeded". Tracking the id already (being)
  // created makes a re-fire for the *same* instance a no-op, so the loop can only
  // ever run once per mount regardless of how many times `getChecklistDetail`'s
  // identity churns.
  const creatingChecklistIdRef = React.useRef<string>();

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
  // own copy instead of only refreshing when `checklistId` changes. See
  // `creatingChecklistIdRef` above for why the ADD branch still needs its
  // own guard against that same churn.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!checklistTemplate) return;

    if (checklistId) {
      const checklist = getChecklistDetail(checklistId);
      setChecklist(checklist);
      return;
    }

    // Should create checklist id if non exist. A deterministic id (see
    // checklistInstanceId) instead of a fresh random one: this effect
    // re-running before its own setSearchParams below has landed (a
    // remount, React Strict Mode's dev double-invoke) upserts the same
    // row instead of minting a duplicate — see useChecklists.tsx's own
    // comment on the same fix for the home page's checkbox.
    const deterministicId = checklistInstanceId(id, new Date(currentDay));
    if (creatingChecklistIdRef.current === deterministicId) return;
    creatingChecklistIdRef.current = deterministicId;

    const checklist = addChecklist({
      id: deterministicId,
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

  const handleDeleteTask = () => {
    if (!id) return;
    deleteChecklistTemplate(id);
    navigate('/');
  };

  const confirmLeaveChallenge = async () => {
    if (!challenge || !id || leaving) return;
    setLeaving(true);
    try {
      await leaveTheChallenge(challenge.id, id);
      navigate('/');
    } finally {
      setLeaving(false);
      setLeaveModalVisible(false);
    }
  };

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
            <Breadcrumb
              items={[
                { label: 'Task', to: '/' },
                {
                  icon: { name: checklistTemplate.avatar?.name || 'solar:settings-linear', color: checklistTemplate.avatar?.color },
                  label: isEditingTitle ? (
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
                      {checklistTemplate.title}
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
                  ),
                },
              ]}
            />
            {isOwner && (
              <div className={styles.headerActions}>
                <Button
                  onClick={() => setIsAiModalVisible(true)}
                  className={styles.aiButton}
                >
                  <Icon icon="solar:magic-stick-3-bold-duotone" width={20} color="#fff" className={styles.aiIcon} />
                  {intl.formatMessage({ id: 'DetailTaskPage.generate-with-ai', defaultMessage: 'Generate with AI' })}
                  {/* The button itself isn't the Pro gate — AiChecklistGenerate's own upsell
                      screen is (see its `!isPro` branch). This is just a heads-up so a non-Pro
                      user isn't surprised by the paywall a click away; hidden once they have
                      access, since it'd just be redundant noise at that point. */}
                  {!isPro && <span className={styles.proBadge}>PRO</span>}
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
                readOnly={!isOwner}
              />
            </div>
            <div className={styles.side}>
              <ChecklistGenericInfo
                isDefaultCollapsed={false}
                checklistTemplate={checklistTemplate}
                onUpdate={isOwner ? updatedTemplate => updateChecklistTemplate(updatedTemplate) : () => {}}
                onDelete={isOwner ? handleDeleteTask : undefined}
                readOnly={!isOwner}
                onUpdateMyReminder={
                  !isOwner && challenge ? repeat => updateMyReminder(id, repeat) : undefined
                }
              >
                {isOwner && <CardShare checklistTemplate={checklistTemplate} />}
              </ChecklistGenericInfo>

              {/* Owner or participant, either way — replaces the plain "View
                  Dashboard" link this used to be (CardShare's own, or the
                  one that lived right here for a participant) with an
                  actual leaderboard preview. index.mobile.tsx renders the
                  same widget in its own single-column flow. */}
              {challenge && <MiniChallengeDashboard challengeId={challenge.id} userId={userId} />}

              {!isOwner && challenge && (
                <div className={styles.challengeActions}>
                  <Button
                    type="ghost"
                    size="sm"
                    onClick={() => setLeaveModalVisible(true)}
                    className={styles.leaveChallengeButton}
                  >
                    {intl.formatMessage({
                      id: 'DetailTaskPage.leave-challenge',
                      defaultMessage: 'Leave Challenge',
                    })}
                  </Button>
                </div>
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

      <WarningModal
        visible={leaveModalVisible}
        title={intl.formatMessage({
          id: 'DetailTaskPage.leave-challenge-confirm-title',
          defaultMessage: 'Leave this challenge?',
        })}
        content={
          <Typography.Text>
            {intl.formatMessage({
              id: 'DetailTaskPage.leave-challenge-confirm-message',
              defaultMessage: "You'll stop showing up on the group dashboard and this task will leave your list. Anything you've already recorded stays yours.",
            })}
          </Typography.Text>
        }
        primaryButtonText={
          leaving
            ? intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-ok-loading', defaultMessage: 'Leaving…' })
            : intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-ok', defaultMessage: 'Leave' })
        }
        primaryButtonOnClick={confirmLeaveChallenge}
        secondaryButtonText={intl.formatMessage({
          id: 'DetailTaskPage.leave-challenge-confirm-cancel',
          defaultMessage: 'Cancel',
        })}
        secondaryButtonClick={() => setLeaveModalVisible(false)}
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
