import React, { useState, useCallback, useEffect } from 'react';
import IconPauseCircle from '@moon-ui/icon/IconPauseCircle';
import IconPlayCircle from '@moon-ui/icon/IconPlayCircle';

// Utils
import cx from 'classnames';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import { songList, songs, useAudioPlayer } from '@dreamer/music-controller-common/src/hooks';

const AudioPlayer = ({ className }: { className?: string }) => {
  const [songLoadedCount, setSongLoadedCount] = React.useState(0);
  const {
    loadSong,
    play,
    pause,
    isPlaying,
    audio,
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
      callback: (src, index) => {
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
        <Typography.Text
          onClick={loadAllSongsLocal}
          className={styles.loadStatus}
        >
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
        {isPlaying ? (
          <IconPauseCircle className={styles.icon} onClick={togglePlay} />
        ) : (
          <IconPlayCircle className={styles.icon} onClick={togglePlay} />
        )}
        <span className={styles.pomodoroPhase}>
          <Typography.Title level={4} className={styles.pomodoroPhaseText}>
            {songs[currentSongIndex].name}
          </Typography.Title>
          <Typography.Text className={styles.time}>{`| ${Math.floor(
            currentTime / 60
          )}:${Math.floor(currentTime % 60)}`}</Typography.Text>
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
