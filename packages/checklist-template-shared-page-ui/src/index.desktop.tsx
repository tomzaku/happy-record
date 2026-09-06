import cx from 'classnames';
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
import styles from './index.desktop.module.scss';

const ChecklistTemplateSharedPageDesktop = () => {
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
    pageBackgroundLayout,
    pageBackgroundImageUrl,
    glassOpacity,
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

  useApplyChallengeTheme(themeId, backgroundImageUrl, pageBackgroundImageUrl);

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
    <div className={styles.page} data-challenge-theme={themeId}>
      {/* Owner-customizable via the config widget's own "Page background" layout picker
          (solid/glass) + transparency slider — see useChecklistTemplateSharedPage.ts's
          pageBackgroundLayout/glassOpacity. Opacity set via inline style (always wins over the
          stylesheet, regardless of class order) since it's a per-challenge numeric value, not one
          of a fixed set of classes the way every other widget layout here is. */}
      <div
        className={cx(styles.sheet, pageBackgroundLayout === 'glass' && styles.sheetGlass)}
        style={
          pageBackgroundLayout === 'glass'
            ? { background: `rgba(var(--ct-glass-tint-rgb), ${glassOpacity / 100})` }
            : undefined
        }
      >
        <div className={styles.headerClip}>
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
        </div>

        <div className={styles.hero}>
          <div className={styles.intro}>
            <div className={styles.chip}>Challenge</div>
            {/* Owner-customizable via the config widget's own "Invitation message" text + its
                independent layout picker (heading/banner/minimal) — greetingHeadline falls back
                to the same auto-generated sentence as before (userName/targetName) when the owner
                hasn't set one. See useChecklistTemplateSharedPage.ts's greetingHeadline/
                defaultGreetingText/greetingWidgetLayout. */}
            <GreetingWidget
              layout={greetingWidgetLayout}
              text={greetingHeadline}
              titleLevel={2}
              className={greetingWidgetLayout === 'heading' ? styles.headline : styles.headlineSpacing}
            />
            <Typography.Text className={styles.subtext} style={{ color: 'var(--ct-body-text)' }}>
              Complete this checklist together and see who keeps the streak alive.
            </Typography.Text>

            <div className={styles.ctaColumn}>
              {/* Owner-customizable via the config widget's own "Take Challenge Button"
                  layout picker (plain/fire/water/colorful) — see
                  useChecklistTemplateSharedPage.ts's buttonWidgetLayout. */}
              <ButtonWidget
                layout={buttonWidgetLayout}
                onClick={handleSubmit}
                disabled={!ready || submitting}
                className={styles.primaryButton}
              >
                {(submitting || !ready) && <Icon icon="svg-spinners:180-ring-with-bg" width={18} />}
                Take the Challenge
              </ButtonWidget>
              <button className={styles.textLink} onClick={onClickLeaveIt} disabled={submitting}>
                Maybe later
              </button>
            </div>
          </div>

          <div className={styles.cardColumn}>
            <TaskSharedCard
              checklistTemplate={checklistTemplate}
              fields={fields}
              fieldsLoading={fieldsLoading}
              challenge={previewChallenge}
            />
          </div>
        </div>
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
