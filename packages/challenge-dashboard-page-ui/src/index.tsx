import React from 'react';
import { useParams } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import { getSharedChecklistTemplateUrl, useSession } from '@dreamer/global';
import { AppShell, Breadcrumb } from '@dreamer/header';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import ChallengeConfigDrawer from '@happy-record/checklist-template-shared-page-ui/src/components/challenge-config-drawer';
import { useChallengeDashboardData } from './hooks/useChallengeDashboardData';
import { useChallengeDashboardConfig } from './hooks/useChallengeDashboardConfig';
import { useChallengeCommentForm } from './hooks/useChallengeCommentForm';
import { useLeaveChallengeFlow } from './hooks/useLeaveChallengeFlow';
import DashboardSkeleton from './components/DashboardSkeleton';
import TargetsCard from './components/TargetsCard';
import RecordDetailCard from './components/RecordDetailCard';
import LogCard from './components/LogCard';
import StreaksCard from './components/StreaksCard';
import LeaderboardCard from './components/LeaderboardCard';
import CommentsCard from './components/CommentsCard';
import AttachmentsSection from './components/AttachmentsSection';
import styles from './index.module.scss';

const ChallengeDashboardPageUi = () => {
  const intl = useIntl();
  const { id } = useParams<{ id: string }>();
  const { userId } = useSession();
  const [inviteCopied, setInviteCopied] = React.useState(false);

  const {
    dashboard,
    error,
    me,
    isOwner,
    checklistTemplate,
    myStreak,
    bestStreak,
    totalCheckIns,
    rankedParticipants,
    hasChallengeTargets,
    refetchDashboard,
  } = useChallengeDashboardData(id, userId);

  const commentForm = useChallengeCommentForm(id, !!dashboard?.challenge?.commentsEnabled, me);
  const leaveFlow = useLeaveChallengeFlow(id, dashboard?.challenge?.checklistTemplateId);
  const challengeConfig = useChallengeDashboardConfig(
    dashboard?.challenge?.checklistTemplateId,
    dashboard?.challenge,
    refetchDashboard,
  );

  // Same link CardShare's own copy icon generates for a template already shared (this page only
  // ever renders once a challenge exists, so it's always public by the time this runs) — no
  // separate invite-link concept to keep in sync with that one.
  const handleInvite = async () => {
    const templateId = dashboard?.challenge?.checklistTemplateId;
    if (!templateId) return;
    try {
      await navigator.clipboard.writeText(getSharedChecklistTemplateUrl(templateId));
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy invite link:', err);
    }
  };

  if (error) {
    return (
      <AppShell>
        <div className={styles.page}>
          <Card className={styles.card}>
            <Typography.Text>
              {intl.formatMessage({ id: 'ChallengeDashboard.not-found', defaultMessage: "Couldn't load this challenge." })}
            </Typography.Text>
          </Card>
        </div>
      </AppShell>
    );
  }

  // The one GET this page makes (getChallengeDashboard) isn't quiet — a
  // real failure sets `error` above — so `!dashboard` here means only one
  // thing: still in flight. Blank space during that wait otherwise looks
  // exactly like "this challenge doesn't exist" for however long the
  // request takes.
  if (!dashboard) {
    return (
      <AppShell>
        <DashboardSkeleton />
      </AppShell>
    );
  }
  if (!dashboard.challenge) return null;

  return (
    <AppShell>
      {/* App.module.scss only caps page width on mobile (`<=tablet`) — every
          desktop page is responsible for its own max-width, same as
          detail-task-page's own `.content`. */}
      <div className={styles.page}>
        {checklistTemplate && (
          <div className={styles.breadcrumbRow}>
            <Breadcrumb
              items={[
                { label: 'Challenge', to: '/challenges' },
                {
                  label: checklistTemplate.title,
                  icon: { name: checklistTemplate.avatar?.name || 'solar:cup-star-line-duotone', color: checklistTemplate.avatar?.color },
                },
              ]}
            />
            <div className={styles.headerActions}>
              <Button type="ghost" size="sm" onClick={handleInvite} className={styles.inviteButton}>
                <Icon width={16} icon={inviteCopied ? 'solar:check-circle-bold' : 'solar:user-plus-line-duotone'} />
                {intl.formatMessage(
                  inviteCopied
                    ? { id: 'ChallengeDashboard.invite-copied', defaultMessage: 'Copied!' }
                    : { id: 'ChallengeDashboard.invite-button', defaultMessage: 'Invite' },
                )}
              </Button>
              {isOwner && (
                <Icon
                  width={22}
                  icon="solar:settings-line-duotone"
                  className={styles.configIcon}
                  onClick={challengeConfig.openChallengeConfig}
                />
              )}
            </div>
          </div>
        )}
        <div className={styles.mainColumn}>
          <TargetsCard dashboard={dashboard} userId={userId} />
          <RecordDetailCard dashboard={dashboard} userId={userId} />
          <StreaksCard dashboard={dashboard} myStreak={myStreak} bestStreak={bestStreak} totalCheckIns={totalCheckIns} />
        </div>

        <div className={styles.sideColumn}>
          <LeaderboardCard
            dashboard={dashboard}
            userId={userId}
            me={me}
            isOwner={isOwner}
            hasChallengeTargets={hasChallengeTargets}
            rankedParticipants={rankedParticipants}
            onLeaveClick={() => leaveFlow.setLeaveModalVisible(true)}
          />

          <LogCard dashboard={dashboard} userId={userId} />

          {dashboard.challenge.commentsEnabled && (
            <CommentsCard
              participants={dashboard.participants}
              userId={userId}
              comments={commentForm.comments}
              commentBody={commentForm.commentBody}
              setCommentBody={commentForm.setCommentBody}
              commentName={commentForm.commentName}
              setCommentName={commentForm.setCommentName}
              posting={commentForm.posting}
              messageInputResetKey={commentForm.messageInputResetKey}
              knownName={commentForm.knownName}
              authorName={commentForm.authorName}
              onPostComment={commentForm.handlePostComment}
            />
          )}
        </div>

        <AttachmentsSection dashboard={dashboard} />
      </div>

      {isOwner && checklistTemplate && (
        <ChallengeConfigDrawer
          visible={challengeConfig.configOpen}
          onDismiss={challengeConfig.closeChallengeConfig}
          challenge={dashboard.challenge}
          numberFields={challengeConfig.numberFields}
          defaultGreeting={`${dashboard.challenge.ownerDisplayName || 'Someone'} just challenged you!`}
          templateTitle={checklistTemplate.title}
          templateIcon={checklistTemplate.avatar?.name}
          onSave={challengeConfig.saveChallengeConfig}
          onChange={() => {}}
        />
      )}

      <WarningModal
        visible={leaveFlow.leaveModalVisible}
        title={intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-title', defaultMessage: 'Leave this challenge?' })}
        content={
          <Typography.Text>
            {intl.formatMessage({
              id: 'DetailTaskPage.leave-challenge-confirm-message',
              defaultMessage: "You'll stop showing up on the group dashboard and this task will leave your list. Anything you've already recorded stays yours.",
            })}
          </Typography.Text>
        }
        primaryButtonText={
          leaveFlow.leaving
            ? intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-ok-loading', defaultMessage: 'Leaving…' })
            : intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-ok', defaultMessage: 'Leave' })
        }
        primaryButtonOnClick={leaveFlow.confirmLeaveChallenge}
        secondaryButtonText={intl.formatMessage({ id: 'DetailTaskPage.leave-challenge-confirm-cancel', defaultMessage: 'Cancel' })}
        secondaryButtonClick={() => leaveFlow.setLeaveModalVisible(false)}
      />
    </AppShell>
  );
};

export default ChallengeDashboardPageUi;
