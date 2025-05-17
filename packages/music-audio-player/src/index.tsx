import React, { useState, useCallback, useEffect } from 'react';
import IconPauseCircle from '@moon-ui/icon/IconPauseCircle';
import IconPlayCircle from '@moon-ui/icon/IconPlayCircle';
import { Icon } from '@iconify/react';

// Utils
import cx from 'classnames';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import {
  songList,
  songs,
  useAudioPlayer,
} from '@dreamer/music-controller-common/src/hooks';

const AudioPlayer = ({ className }: { className?: string }) => {
  const [songLoadedCount, setSongLoadedCount] = React.useState(0);
  const {
    loadSong,
    play,
    pause,
    isPlaying,
    audio,
    next,
    prev,
    currentTime,
    currentSongIndex,
    loadAllSongs,
    duration,
  } = useAudioPlayer({
    autoPlayDefault: true,
  });
  const loadAllSongsLocal = async () => {
    await loadAllSongs({
      songs: songList,
      callback: () => {
        setSongLoadedCount(s => s + 1);
      },
    });
  };

  React.useEffect(() => {
    loadAllSongsLocal();
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };
  return (
    <div className={cx(styles.container, className)}>
      {songLoadedCount !== songList.length && (
        <Typography.Text className={styles.loadStatus}>
          load song{songLoadedCount}/{songList.length}
        </Typography.Text>
      )}
      {currentTime > 0 && (
        <div className={styles.progressContainer}>
          <div
            className={styles.progress}
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      )}
      <div className={styles.body}>
        <Icon icon="material-symbols:skip-previous-rounded" height={24} color="white" onClick={() => prev()} />
        {isPlaying ? (
          <IconPauseCircle className={styles.icon} width={42} onClick={togglePlay} />
        ) : (
          <IconPlayCircle className={styles.icon} onClick={togglePlay} />
        )}
        <Icon icon="material-symbols:skip-next-rounded" height={24} color="white"  onClick={() => next()} />
        <span className={styles.pomodoroPhase}>
          <Typography.Title level={4} className={styles.pomodoroPhaseText}>
            {`${currentSongIndex + 1}. ${songs[currentSongIndex].name}`}
          </Typography.Title>
          <Typography.Text className={styles.time}>{`| ${Math.floor(
            currentTime / 60,
          )}:${Math.floor(currentTime % 60)}`}</Typography.Text>
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
