import React from 'react';
import {
  useChallenge,
  useChecklistTemplates,
  useJoinChallenge,
  usePendingChallengeJoin,
  useSession,
} from '@dreamer/global';
import AppHeader, { BackHeader } from '@dreamer/header';
import { useParams, useSearchParams } from 'react-router-dom';
import TaskSharedCard from './components/task-shared-card';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button/src/DefaultButton';
import { useRecordField } from '@dreamer/global/src/store/record-field';
import { useNavigate } from 'react-router-dom';
import Typography from '@moon-ui/typography';
import Input from '@moon-ui/input';
import styles from './index.module.scss';
import Drawer from '@moon-ui/drawer';
import Icon from '@moon-ui/icon/Icon';
import Timer from './components/timer';
import { useGetChecklistTemplateApi } from '@dreamer/global/src/hook/checklist-template/useGetChecklistTemplateApi';
import type { ChecklistTemplate } from '@dreamer/global';
import type { RecordField } from '@dreamer/global/src/store/record-field';

const ChecklistTemplateSharedPageUi = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // Just greeting text, carried in the URL rather than fetched — see
  // util.ts's getSharedChecklistTemplateUrl and useCreateChecklistTemplateApi.tsx.
  const userName = searchParams.get('from') || 'Someone';
  const targetName = searchParams.get('to') || 'you';
  const { getRecordFieldsByIds, mergeRecordFields } = useRecordField();
  const [dialogRejectOpen, setDialogRejectOpen] = React.useState(false);
  const { addChecklistTemplate, getChecklistTemplate } = useChecklistTemplates();
  const { getChallengeForTemplate } = useChallenge();
  const { acceptChallenge } = useJoinChallenge();
  const { savePendingChallengeJoin } = usePendingChallengeJoin();
  const { isAnonymous, signInWithGoogle } = useSession();
  // `id` here is the *owner's* template id (the challenge's canonical
  // checklist_template_id), not any local copy — exactly what
  // getChallengeForTemplate expects.
  const challenge = getChallengeForTemplate(id);
  const isChallenge = !!challenge && (challenge.shareRecords || challenge.commentsEnabled);
  const navigate = useNavigate();
  const { getChecklistTemplateApi } = useGetChecklistTemplateApi();

  const [data, setData] = React.useState<{ checklistTemplate: ChecklistTemplate; fields: RecordField[] } | null>(
    null,
  );
  const [dialogJoinOpen, setDialogJoinOpen] = React.useState(false);
  const [displayName, setDisplayName] = React.useState(targetName);

  // The plain, pre-challenge "Take it": forks the shared template into a
  // brand-new row this device owns outright (its own id, never public, no
  // flag — a flag id copied verbatim would point at a flag this device
  // can't see or manage). Unchanged from before challenges existed, and
  // still what happens for a share with neither challenge option on.
  const takeItPlain = async () => {
    if (!data) return;
    const existingFields = await getRecordFieldsByIds(data.fields.map(f => f.id));
    const newFields = data.fields.filter(f => !existingFields.find(existing => existing.id === f.id));
    if (newFields.length) mergeRecordFields(newFields);
    addChecklistTemplate({ ...data.checklistTemplate, visibility: 'private', flagId: undefined });
    navigate('/');
  };

  // Joining a challenge never forks — see useJoinChallenge — and requires a
  // real (Google) sign-in, since an anonymous identity is throwaway and
  // wouldn't mean anything on a leaderboard. `signInWithGoogle` navigates
  // away to Google's consent screen and back — the redirect does land back
  // on this same page (see useSession.ts's `redirectTo`), but this
  // component has no "resume on return" logic of its own (and the URL's
  // `?from=&to=` greeting params don't survive the round trip either), so
  // the intent still has to be saved first and picked back up by the
  // root-mounted resume hook — see useResumePendingChallengeJoin.
  const joinTheChallenge = async (name: string) => {
    if (!id || !challenge) return;
    if (isAnonymous) {
      savePendingChallengeJoin({ challengeId: challenge.id, checklistTemplateId: id, displayName: name });
      await signInWithGoogle();
      return;
    }
    const joined = await acceptChallenge(id, challenge.id, name);
    if (joined) navigate(`/task/${joined.id}`);
  };

  const confirmTakeIt = (name: string) => (isChallenge ? joinTheChallenge(name) : takeItPlain());

  const handleSubmit = () => {
    if (!data) return;
    if (getChecklistTemplate(data.checklistTemplate.id)) {
      alert("You've have this task!!!");
      return;
    }
    // Only ask for a name (and possibly a sign-in) when there's actually a
    // challenge to join — otherwise this behaves exactly as it always has.
    if (isChallenge) {
      setDialogJoinOpen(true);
      return;
    }
    takeItPlain();
  };

  const onClickLeaveIt = () => {
    setDialogRejectOpen(true);
  };
  const fetchApi = async () => {
    if (id) {
      const result = await getChecklistTemplateApi(id);
      setData(result);
    }
  };
  React.useEffect(() => {
    console.log('ID', id);
    fetchApi();
  }, [id]);
  if (!data) {
    return null;
  }

  return (
    <div>
      <AppHeader />
      <Card className={styles.card}>
        <Typography.Title
          level={3}
        >{`Hey, ${targetName} - ${userName} just challenged you!`}</Typography.Title>
        <TaskSharedCard
          checklistTemplate={data.checklistTemplate}
          fields={data.fields}
        />
        <div className={styles.footerContainer}>
          <Button onClick={handleSubmit} className={styles.button}>
            Take it
          </Button>
          <Typography.Text className={styles.orText}>or</Typography.Text>
          <Button onClick={onClickLeaveIt} className={styles.buttonLeaveIt}>
            Leave it
          </Button>
        </div>
      </Card>
      <Drawer
        visible={dialogJoinOpen}
        className={styles.drawerContainer}
        onBlur={() => setDialogJoinOpen(false)}
      >
        <div>
          <div className={styles.header}>
            <Typography.Title noMargin level={2}>
              Join the challenge
            </Typography.Title>
            <Icon
              width={32}
              icon="material-symbols:close-rounded"
              onClick={() => setDialogJoinOpen(false)}
            />
          </div>
          <Typography.Text>
            {isAnonymous
              ? "Sign in with Google to join — you'll show up on the leaderboard as:"
              : challenge?.shareRecords
                ? "You'll show up on the group dashboard as:"
                : 'What name should your comments show?'}
          </Typography.Text>
          <Input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            renderRightInput={() => <></>}
          />
          <Button
            onClick={() => {
              setDialogJoinOpen(false);
              joinTheChallenge(displayName.trim() || targetName);
            }}
            className={styles.button}
          >
            {isAnonymous ? 'Sign in with Google' : 'Join'}
          </Button>
        </div>
      </Drawer>
      <Drawer
        visible={dialogRejectOpen}
        className={styles.drawerContainer}
        onBlur={() => setDialogRejectOpen(false)}
      >
        <div>
          <div className={styles.header}>
            <Typography.Title noMargin level={2}>
              Are you sure? Or just a misclick
            </Typography.Title>

            <Icon
              width={32}
              icon="material-symbols:close-rounded"
              onClick={() => setDialogRejectOpen(false)}
            />
          </div>
          <Typography.Title level={3}>
            {`Don't worry, ${targetName}`}
          </Typography.Title>
          <Typography.Text>
            I know you’re not scared of this challenge, so I’ll take it for you
            in 10 seconds.
          </Typography.Text>
          <Timer
            duration={10000}
            onFinish={() => confirmTakeIt(displayName.trim() || targetName)}
            autoStart
          />
        </div>
      </Drawer>
    </div>
  );
};

export default ChecklistTemplateSharedPageUi;
