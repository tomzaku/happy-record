import { BackHeader } from '@dreamer/header';
import Typography from '@moon-ui/typography';
import Input from '@moon-ui/input';
import Drawer from '@moon-ui/drawer';
import Icon from '@moon-ui/icon/Icon';
import TaskSharedCard from './components/task-shared-card';
import Timer from './components/timer';
import { useChecklistTemplateSharedPage } from './useChecklistTemplateSharedPage';
import { useApplyChallengeTheme } from './theme';
import styles from './index.mobile.module.scss';

const ChecklistTemplateSharedPageMobile = () => {
  const {
    data,
    userName,
    targetName,
    displayName,
    setDisplayName,
    dialogJoinOpen,
    setDialogJoinOpen,
    dialogRejectOpen,
    setDialogRejectOpen,
    isAnonymous,
    challenge,
    themeId,
    submitting,
    handleSubmit,
    onClickLeaveIt,
    confirmTakeIt,
    joinTheChallenge,
  } = useChecklistTemplateSharedPage();

  useApplyChallengeTheme(themeId);

  if (!data) return null;

  return (
    <div className={styles.page}>
      <BackHeader renderLeftComponent={() => <span className={styles.navText}>Dreamer</span>} />

      <div className={styles.body}>
        <div className={styles.chip}>Challenge</div>
        <Typography.Title
          level={3}
          noMargin
          className={styles.headline}
          style={{ color: 'var(--ct-heading-color)' }}
        >
          {`${userName} just challenged you, ${targetName}!`}
        </Typography.Title>
        <Typography.Text className={styles.subtext} style={{ color: 'var(--ct-body-text)' }}>
          Complete this checklist together and see who keeps the streak alive.
        </Typography.Text>

        <TaskSharedCard checklistTemplate={data.checklistTemplate} fields={data.fields} />
      </div>

      {/* Pinned to the bottom of the viewport instead of at the end of the
          scroll — the old layout buried "Take it"/"Leave it" wherever the
          card's own content happened to end, off-screen behind however many
          fields the template has. */}
      <div className={styles.stickyBar}>
        <button className={styles.primaryButton} onClick={handleSubmit} disabled={submitting}>
          {submitting && <Icon icon="svg-spinners:180-ring-with-bg" width={16} />}
          Take the Challenge
        </button>
        <button className={styles.textLink} onClick={onClickLeaveIt} disabled={submitting}>
          Maybe later
        </button>
      </div>

      <Drawer
        visible={dialogJoinOpen}
        className={styles.drawerContainer}
        onBlur={() => setDialogJoinOpen(false)}
      >
        <div>
          <div className={styles.drawerHeader}>
            <Typography.Title noMargin level={2}>
              Join the challenge
            </Typography.Title>
            <Icon width={32} icon="material-symbols:close-rounded" onClick={() => setDialogJoinOpen(false)} />
          </div>
          <Typography.Text>
            {isAnonymous
              ? "Sign in with Google to join — you'll show up on the leaderboard as:"
              : challenge?.shareRecords
                ? "You'll show up on the group dashboard as:"
                : 'What name should your comments show?'}
          </Typography.Text>
          <Input value={displayName} onChange={e => setDisplayName(e.target.value)} renderRightInput={() => <></>} />
          <button
            className={styles.primaryButton}
            disabled={submitting}
            onClick={() => {
              // Left open, disabled + spinning, until the request actually
              // resolves — see index.desktop.tsx's matching button.
              joinTheChallenge(displayName.trim() || targetName);
            }}
          >
            {submitting && <Icon icon="svg-spinners:180-ring-with-bg" width={16} />}
            {isAnonymous ? 'Sign in with Google' : 'Join'}
          </button>
        </div>
      </Drawer>

      <Drawer
        visible={dialogRejectOpen}
        className={styles.drawerContainer}
        onBlur={() => setDialogRejectOpen(false)}
      >
        <div>
          <div className={styles.drawerHeader}>
            <Typography.Title noMargin level={2}>
              Are you sure? Or just a misclick
            </Typography.Title>
            <Icon width={32} icon="material-symbols:close-rounded" onClick={() => setDialogRejectOpen(false)} />
          </div>
          <Typography.Title level={3}>{`Don't worry, ${targetName}`}</Typography.Title>
          <Typography.Text>
            I know you’re not scared of this challenge, so I’ll take it for you in 10 seconds.
          </Typography.Text>
          <Timer duration={10000} onFinish={() => confirmTakeIt(displayName.trim() || targetName)} autoStart />
        </div>
      </Drawer>
    </div>
  );
};

export default ChecklistTemplateSharedPageMobile;
