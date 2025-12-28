import React from 'react';
import styles from './Scoreboard.module.scss';

type ScoreboardProps = {
  greenScore: number;
  redScore: number;
};

const Scoreboard = ({ greenScore, redScore }: ScoreboardProps) => {
  return (
    <div className={styles.scoreboard}>
      <div className={styles.team}>
        <div className={styles.teamName}>GREEN</div>
        <div className={styles.score}>{greenScore}</div>
      </div>
      <div className={styles.divider}>VS</div>
      <div className={styles.team}>
        <div className={styles.teamName}>RED</div>
        <div className={styles.score}>{redScore}</div>
      </div>
    </div>
  );
};

export default Scoreboard;

