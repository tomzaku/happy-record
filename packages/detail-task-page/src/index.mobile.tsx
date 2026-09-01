import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Checklist,
  checklistInstanceId,
  useChallenge,
  useChecklist,
  useChecklistTemplates,
  useFieldGroups,
  useLeaveChallenge,
  useSession,
  useSyncedSelector,
} from '@dreamer/global';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { BackHeader } from '@dreamer/header';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import Typography from '@moon-ui/typography';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import ChecklistFieldGroup from './components/ChecklistFieldGroup';
import ChecklistGenericInfo from './components/ChecklistGenericInfo';
import AiChecklistGenerate from './components/AiChecklistGenerate';
import CardShare from './components/CardShare';
import MiniChallengeDashboard from './components/MiniChallengeDashboard';

const DetailTaskPageMobile = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearchParams] = useSearchParams();
  const { getChecklistTemplate, updateChecklistTemplate, updateMyReminder, deleteChecklistTemplate } =
    useChecklistTemplates();
  const { addChecklist, getChecklistDetail } = useChecklist();
  const { getAllRecordFields, allRecordFieldsLoading, getRecordFieldsByTemplateId } = useRecordField();
  const { getFieldGroupsByTemplateId } = useFieldGroups();
  const { getChallengeForTemplate } = useChallenge();
  const { leaveTheChallenge } = useLeaveChallenge();
  const { userId } = useSession();
  const intl = useIntl();
  const checklistId = search.get('checklistId');
  const currentDay = search.get('currentDay');

  // Derived straight from each store's own function every render (see
  // useSyncedSelector) instead of snapshotted into local state from an
  // effect — a template/field synced in from another device now actually
  // shows up here instead of only refreshing when `checklistId` changes.
  const checklistTemplate = useSyncedSelector(getChecklistTemplate, id ?? '');
  // A joined challenge's fields are the owner's own, private rows — `getAllRecordFields` (own +
  // public only) can never resolve them for a participant. This triggers the same `?templateId=`
  // fetch the shared-template page uses (a no-op for the caller's own, still-private template) —
  // see useRecordField.tsx's own comment — merging into the same store `getAllRecordFields` reads.
  useSyncedSelector(getRecordFieldsByTemplateId, id ?? '');
  // Same gap, one resource over: a joined challenge's field groups are the owner's own rows,
  // which `getFieldGroups`' own "all mine" fetch (home page's calendar scanning, see
  // useFieldGroups.tsx) never includes once it's already run this session — this bypass is what
  // actually loads them, merging into the same store `checklistTemplate.fieldGroups` is synced
  // from (see useChecklistTemplates.tsx's own effect).
  useSyncedSelector(getFieldGroupsByTemplateId, id ?? '');
  const fields = useSyncedSelector(getAllRecordFields);
  // Joining a challenge never forks the template (see CLAUDE.md) — a
  // participant's local copy is the owner's exact row, so this page needs
  // to tell "mine" from "one I joined" itself.
  const challenge = getChallengeForTemplate(id);
  const isOwner = !challenge || challenge.ownerId === userId;
  const [checklist, setChecklist] = React.useState<Checklist>();
  const [isAiModalVisible, setIsAiModalVisible] = React.useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  // Guards the "create if missing" branch below against #185 (see
  // index.desktop.tsx's matching ref for the full mechanism): `getChecklistDetail`'s
  // identity changes on every write to the `checklist` store — including
  // `addChecklist`'s own write below — so once this branch runs, the effect
  // immediately re-fires, and if `checklistId` hasn't turned truthy yet takes
  // this branch *again*, creating the same checklist forever (`addChecklist`
  // sets a fresh `updatedAt` unconditionally, unlike every other store write
  // here, so each iteration is a genuine, unbounded write — confirmed live via
  // #185's debug logging until it hit React's "Maximum update depth exceeded").
  const creatingChecklistIdRef = React.useRef<string>();

  if (!id || !currentDay) {
    return;
  }
  // Load or create checklist. `addChecklist`/`setSearchParams` deliberately
  // not in the deps array — see index.desktop.tsx's matching effect for why
  // (addChecklist's own identity changes with the store it writes to,
  // which would retrigger creation every time this call succeeds).
  // `getChecklistDetail` IS included so a checklist completed/edited on
  // another device refreshes this page's own copy — see `creatingChecklistIdRef`
  // above for why the ADD branch still needs its own guard against that same churn.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!checklistTemplate) return;

    if (checklistId) {
      const checklist = getChecklistDetail(checklistId);
      setChecklist(checklist);
      return;
    }

    // Should create checklist id if non exist. Deterministic id — see
    // index.desktop.tsx's matching effect and useChecklists.tsx's
    // checklistInstanceId for why (this effect re-running before its own
    // setSearchParams lands should upsert, not duplicate).
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
    setSearchParams({
      ...Object.fromEntries(search),
      checklistId: checklist.id,
    });
    setChecklist(checklist);
  }, [checklistTemplate, checklistId, id, currentDay, getChecklistDetail]);

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
    <>
      <BackHeader
        renderLeftComponent={() => <div>{checklistTemplate?.title}</div>}
        renderRightComponent={() => (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isOwner && (
              <Icon
                onClick={() => setIsAiModalVisible(true)}
                width={24}
                icon="solar:magic-stick-3-bold-duotone"
                style={{ cursor: 'pointer' }}
              />
            )}
            {!isOwner && challenge && (
              <Icon
                onClick={() => navigate(`/challenge/${challenge.id}`)}
                width={24}
                icon="solar:round-graph-outline"
                style={{ cursor: 'pointer' }}
              />
            )}
          </div>
        )}
        onClickLeftButton={() => navigate('/')}
      />
      {/* Same widget/condition as index.desktop.tsx's own side column — owner
          or participant either way, replacing the header's plain dashboard
          icon (and CardShare's old link) with an actual leaderboard preview.
          Its own "⋮" menu is now the one "Leave Challenge" trigger for this
          page too — replaces the header's own logout icon above. */}
      {challenge && (
        <MiniChallengeDashboard
          challengeId={challenge.id}
          userId={userId}
          onLeaveChallenge={() => setLeaveModalVisible(true)}
        />
      )}
      {allRecordFieldsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Icon width={32} icon="svg-spinners:180-ring" />
        </div>
      ) : (
        <ChecklistFieldGroup
          checklist={checklist}
          checklistTemplate={checklistTemplate}
          fields={fields}
          currentDay={currentDay}
          readOnly={!isOwner}
        />
      )}
      {/* General Settings — mobile's actual task content (the fields above)
          is what someone opens this page to see/do; the settings card is
          metadata about the task, not the task itself, so it reads better
          at the bottom than pushing the real content below the fold. */}
      <ChecklistGenericInfo
        isDefaultCollapsed
        checklistTemplate={checklistTemplate}
        onUpdate={isOwner ? (updatedTemplate) => updateChecklistTemplate(updatedTemplate) : () => {}}
        onDelete={isOwner ? handleDeleteTask : undefined}
        readOnly={!isOwner}
        onUpdateMyReminder={!isOwner && challenge ? repeat => updateMyReminder(id, repeat) : undefined}
      >
        {isOwner && <CardShare checklistTemplate={checklistTemplate} />}
      </ChecklistGenericInfo>

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
    </>
  );
};

export default DetailTaskPageMobile;
