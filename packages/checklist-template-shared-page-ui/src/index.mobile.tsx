import { BackHeader } from '@dreamer/header';
import Typography from '@moon-ui/typography';
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
    dialogRejectOpen,
    setDialogRejectOpen,
    themeId,
    backgroundImageUrl,
    submitting,
    handleSubmit,
    onClickLeaveIt,
    confirmTakeIt,
  } = useChecklistTemplateSharedPage();

  // Mobile renders backgroundImageUrl as a real <img> below TaskSharedCard
  // (see below), not through the CSS var useApplyChallengeTheme's second
  // arg sets — that's desktop's .hero-background mechanism only, see theme.ts.
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
          {/* No hardcoded "you" here — targetName already defaults to 'you'
              (see useChecklistTemplateSharedPage), so a literal "you" plus
              targetName duplicated into "challenged you, you!" whenever the
              link's own ?to= was left blank, which is every link CardShare
              generates today (it never collects a target name). */}
          {`${userName} just challenged ${targetName}!`}
        </Typography.Title>
        <Typography.Text className={styles.subtext} style={{ color: 'var(--ct-body-text)' }}>
          Complete this checklist together and see who keeps the streak alive.
        </Typography.Text>

        <TaskSharedCard checklistTemplate={data.checklistTemplate} fields={data.fields} />
        {/* Owner's optional CardShare photo — see theme.ts's useApplyChallengeTheme
            for why desktop instead paints this as a .hero background. */}
        {backgroundImageUrl && <img src={backgroundImageUrl} alt="" className={styles.heroImage} />}
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
          <Timer duration={10000} onFinish={() => confirmTakeIt()} autoStart />
        </div>
      </Drawer>
    </div>
  );
};

export default ChecklistTemplateSharedPageMobile;
