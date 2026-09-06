import React from 'react';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Skeleton from '@moon-ui/skeleton';
import styles from '../../index.module.scss';

/**
 * One skeleton per real card (Targets/Streaks/Leaderboard/Comments), reusing
 * their own layout classes with a Skeleton block standing in for each piece
 * of real content — not a single generic spinner, which told you *something*
 * was loading but nothing about the page you were about to land on, and
 * however long the fetch took, sat there doing nothing. Laid out in the
 * same mainColumn/sideColumn split as the real page so there's no jump once
 * it lands, just a swap.
 */
const DashboardSkeleton = () => (
  <div className={styles.page}>
    <div className={`${styles.breadcrumbRow} ${styles.breadcrumbSkeletonRow}`}>
      <Typography.Text className={styles.breadcrumbSkeletonLabel}>Challenge</Typography.Text>
      <Skeleton circle width={24} height={24} />
      <Skeleton width={140} height={22} />
    </div>
    <div className={styles.mainColumn}>
      <Card className={`${styles.card} ${styles.cardNoPadding}`}>
        <div className={styles.cardHeaderWash} style={{ background: 'rgba(42, 120, 214, 0.08)' }}>
          <div className={styles.cardHeaderTitle}>
            <Skeleton circle width={22} height={22} />
            <Skeleton width={70} height={18} />
          </div>
          <Skeleton width="65%" height={12} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.targetList}>
            {[0, 1].map(i => (
              <div key={i} className={styles.target}>
                <div className={styles.targetHeader}>
                  <Skeleton width={90} height={14} />
                  <Skeleton width={60} height={12} />
                </div>
                <Skeleton width="100%" height={12} radius={999} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className={`${styles.card} ${styles.cardNoPadding}`}>
        <div className={styles.cardHeaderWash} style={{ background: 'rgba(235, 104, 52, 0.08)' }}>
          <div className={styles.cardHeaderTitle}>
            <Skeleton circle width={22} height={22} />
            <Skeleton width={70} height={18} />
          </div>
          <Skeleton width="75%" height={12} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.statBlockRow}>
            {[0, 1, 2].map(i => (
              <div key={i} className={styles.statBlock}>
                <Skeleton circle width={26} height={26} />
                <Skeleton width={32} height={22} />
                <Skeleton width={64} height={10} />
              </div>
            ))}
          </div>
          <Skeleton width="100%" height={160} radius={12} />
        </div>
      </Card>
    </div>

    <div className={styles.sideColumn}>
      <Card className={`${styles.card} ${styles.cardNoPadding}`}>
        <div className={styles.cardHeaderWash} style={{ background: 'rgba(237, 161, 0, 0.08)' }}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardHeaderTitle}>
              <Skeleton circle width={22} height={22} />
              <Skeleton width={90} height={18} />
            </div>
          </div>
          <Skeleton width="55%" height={12} />
        </div>
        <div className={styles.cardBody}>
          {[0, 1, 2].map(i => (
            <div key={i} className={styles.rankRow}>
              <Skeleton width={18} height={16} />
              <Skeleton circle width={40} height={40} />
              <div className={styles.rankInfo}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} />
              </div>
              <div className={styles.rankScoreCol}>
                <Skeleton width={24} height={18} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className={`${styles.card} ${styles.cardNoPadding}`}>
        <div className={styles.cardHeaderWash} style={{ background: 'rgba(138, 79, 209, 0.08)' }}>
          <div className={styles.cardHeaderTitle}>
            <Skeleton circle width={22} height={22} />
            <Skeleton width={100} height={18} />
          </div>
          <Skeleton width="70%" height={12} />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.comments}>
            {[0, 1].map(i => (
              <div key={i} className={styles.commentRow}>
                <Skeleton circle width={26} height={26} />
                <div className={styles.bubbleCol}>
                  <Skeleton width={150} height={32} radius={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  </div>
);

export default DashboardSkeleton;
