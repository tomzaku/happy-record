import { BackHeader } from '@dreamer/header';
import Typography from '@moon-ui/typography';
import Drawer from '@moon-ui/drawer';
import Icon from '@moon-ui/icon/Icon';
import TaskSharedCard from './components/task-shared-card';
import Timer from './components/timer';
import ChallengeConfigDrawer from './components/challenge-config-drawer';
import GreetingWidget from './components/challenge-widgets/GreetingWidget';
import ButtonWidget from './components/challenge-widgets/ButtonWidget';
import { useChecklistTemplateSharedPage } from './useChecklistTemplateSharedPage';
import { useApplyChallengeTheme } from './theme';
import styles from './index.mobile.module.scss';

const ChecklistTemplateSharedPageMobile = () => {
  const {
    checklistTemplate,
    fields,
    fieldsLoading,
    ready,
    targetName,
    greetingHeadline,
    defaultGreetingText,
    greetingWidgetLayout,
    buttonWidgetLayout,
    pageBackgroundImageUrl,
    dialogRejectOpen,
    setDialogRejectOpen,
    themeId,
    backgroundImageUrl,
    challenge,
    previewChallenge,
    isOwner,
    configOpen,
    openChallengeConfig,
    closeChallengeConfig,
    updateChallengeConfigDraft,
    saveChallengeConfig,
    submitting,
    handleSubmit,
    onClickLeaveIt,
    confirmTakeIt,
  } = useChecklistTemplateSharedPage();
  const numberFields = fields.filter(f => f.type === 'number');

  // Mobile renders backgroundImageUrl (the corner accent) as a real <img> below TaskSharedCard
  // (see below), not through the CSS var useApplyChallengeTheme's second arg sets — that's
  // desktop's .hero-background mechanism only, see theme.ts. pageBackgroundImageUrl (the
  // whole-page photo) is a separate mechanism this page's own `.page` reads directly, so it's
  // still passed through here as the 3rd arg.
  useApplyChallengeTheme(themeId, undefined, pageBackgroundImageUrl);

  // Only the template itself gates the page rendering at all — fields/fieldGroups load in behind
  // it (see useChecklistTemplateSharedPage.ts), TaskSharedCard shows its own small spinner for
  // those meanwhile.
  if (!checklistTemplate) {
    return (
      <div className={styles.page} data-challenge-theme={themeId}>
        <BackHeader renderLeftComponent={() => <span className={styles.navText}>Dreamer</span>} />
        <div className={styles.loadingState}>
          <Icon width={36} icon="svg-spinners:180-ring" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} data-challenge-theme={themeId}>
      <BackHeader
        renderLeftComponent={() => <span className={styles.navText}>Dreamer</span>}
        renderRightComponent={() =>
          isOwner && challenge ? (
            <Icon
              width={22}
              icon="solar:settings-line-duotone"
              className={styles.configIcon}
              onClick={openChallengeConfig}
            />
          ) : null
        }
      />

      <div className={styles.body}>
        <div className={styles.chip}>Challenge</div>
        {/* Owner-customizable via the config widget's own "Invitation message" text + its
            independent layout picker (heading/banner/minimal) — greetingHeadline falls back to
            the same auto-generated sentence as before (userName/targetName) when the owner hasn't
            set one. See useChecklistTemplateSharedPage.ts's greetingHeadline/defaultGreetingText/
            greetingWidgetLayout. No font-size override needed here the way desktop's .headline
            has one — mobile's .headline is spacing-only, safe to apply for every layout. */}
        <GreetingWidget layout={greetingWidgetLayout} text={greetingHeadline} titleLevel={3} className={styles.headline} />
        <Typography.Text className={styles.subtext} style={{ color: 'var(--ct-body-text)' }}>
          Complete this checklist together and see who keeps the streak alive.
        </Typography.Text>

        <TaskSharedCard
          checklistTemplate={checklistTemplate}
          fields={fields}
          fieldsLoading={fieldsLoading}
          challenge={previewChallenge}
        />
        {/* Owner's optional CardShare photo — see theme.ts's useApplyChallengeTheme
            for why desktop instead paints this as a .hero background. */}
        {backgroundImageUrl && <img src={backgroundImageUrl} alt="" className={styles.heroImage} />}
      </div>

      {isOwner && challenge && (
        <ChallengeConfigDrawer
          visible={configOpen}
          onDismiss={closeChallengeConfig}
          challenge={challenge}
          numberFields={numberFields}
          defaultGreeting={defaultGreetingText}
          templateTitle={checklistTemplate.title}
          templateIcon={checklistTemplate.avatar?.name}
          onSave={saveChallengeConfig}
          onChange={updateChallengeConfigDraft}
        />
      )}

      {/* Pinned to the bottom of the viewport instead of at the end of the
          scroll — the old layout buried "Take it"/"Leave it" wherever the
          card's own content happened to end, off-screen behind however many
          fields the template has. */}
      <div className={styles.stickyBar}>
        {/* Owner-customizable via the config widget's own "Take Challenge Button" layout picker
            (plain/fire/water/colorful) — see useChecklistTemplateSharedPage.ts's buttonWidgetLayout. */}
        <ButtonWidget
          layout={buttonWidgetLayout}
          onClick={handleSubmit}
          disabled={!ready || submitting}
          className={styles.primaryButton}
        >
          {(submitting || !ready) && <Icon icon="svg-spinners:180-ring-with-bg" width={16} />}
          Take the Challenge
        </ButtonWidget>
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
