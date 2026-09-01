import { BackHeader } from '@dreamer/header';
import Typography from '@moon-ui/typography';
import Drawer from '@moon-ui/drawer';
import Icon from '@moon-ui/icon/Icon';
import TaskSharedCard from './components/task-shared-card';
import Timer from './components/timer';
import { useChecklistTemplateSharedPage } from './useChecklistTemplateSharedPage';
import { useApplyChallengeTheme } from './theme';
import styles from './index.desktop.module.scss';

const ChecklistTemplateSharedPageDesktop = () => {
  const {
    checklistTemplate,
    fields,
    fieldsLoading,
    ready,
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

  useApplyChallengeTheme(themeId, backgroundImageUrl);

  // Only the template itself gates the page rendering at all — fields/fieldGroups load in behind
  // it (see useChecklistTemplateSharedPage.ts), TaskSharedCard shows its own small spinner for
  // those meanwhile.
  if (!checklistTemplate) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Icon width={40} icon="svg-spinners:180-ring" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.sheet}>
        <div className={styles.headerClip}>
          <BackHeader renderLeftComponent={() => <span className={styles.navText}>Dreamer</span>} />
        </div>

        <div className={styles.hero}>
          <div className={styles.intro}>
            <div className={styles.chip}>Challenge</div>
            <Typography.Title
              level={2}
              noMargin
              className={styles.headline}
              style={{ color: 'var(--ct-heading-color)' }}
            >
              {/* See index.mobile.tsx's twin line — no hardcoded "you" here,
                  targetName already defaults to it. */}
              {`${userName} just challenged ${targetName}!`}
            </Typography.Title>
            <Typography.Text className={styles.subtext} style={{ color: 'var(--ct-body-text)' }}>
              Complete this checklist together and see who keeps the streak alive.
            </Typography.Text>

            <div className={styles.ctaColumn}>
              <button className={styles.primaryButton} onClick={handleSubmit} disabled={!ready || submitting}>
                {(submitting || !ready) && <Icon icon="svg-spinners:180-ring-with-bg" width={18} />}
                Take the Challenge
              </button>
              <button className={styles.textLink} onClick={onClickLeaveIt} disabled={submitting}>
                Maybe later
              </button>
            </div>
          </div>

          <div className={styles.cardColumn}>
            <TaskSharedCard checklistTemplate={checklistTemplate} fields={fields} fieldsLoading={fieldsLoading} />
          </div>
        </div>
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

export default ChecklistTemplateSharedPageDesktop;
