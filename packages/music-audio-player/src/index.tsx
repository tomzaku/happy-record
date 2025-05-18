import React, { useState, useCallback, useEffect } from 'react';
import IconPauseCircle from '@moon-ui/icon/IconPauseCircle';
import IconPlayCircle from '@moon-ui/icon/IconPlayCircle';
import { Icon } from '@iconify/react';

// Utils
import cx from 'classnames';

import styles from './index.module.scss';
import Typography from '@moon-ui/typography';
import {
  songList as defaultSongList,
  songs,
  useAudioPlayer,
} from '@dreamer/music-controller-common/src/hooks';
import AudioSongListDrawer from './audio-song-list-drawer';

const AudioPlayer = ({ className }: { className?: string }) => {
  const [songLoadedCount, setSongLoadedCount] = React.useState(0);
  const {
    play,
    pause,
    isPlaying,
    next,
    prev,
    currentTime,
    currentSongIndex,
    loadAllSongs,
    duration,
    songList,
  } = useAudioPlayer({
    autoPlayDefault: true,
  });
  console.log('>>>>>>>>SONG LISTSSS from parent', songList);
  const [listSongVisible, setListSongVisible] = useState(false);
  const loadAllSongsLocal = async () => {
    await loadAllSongs({
      songs: defaultSongList,
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
      <AudioSongListDrawer
        visible={listSongVisible}
        onClose={() => setListSongVisible(false)}
      />
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
        <Icon
          icon="material-symbols:skip-previous-rounded"
          height={24}
          color="white"
          onClick={() => prev()}
        />
        {isPlaying ? (
          <IconPauseCircle
            className={styles.icon}
            width={42}
            onClick={togglePlay}
          />
        ) : (
          <IconPlayCircle className={styles.icon} onClick={togglePlay} />
        )}
        <Icon
          icon="material-symbols:skip-next-rounded"
          height={32}
          width={32}
          color="white"
          onClick={() => next()}
        />
        <span className={styles.pomodoroPhase}>
          <Typography.Title
            onClick={() => setListSongVisible(true)}
            level={4}
            className={styles.pomodoroPhaseText}
          >
            {`${currentSongIndex + 1}. ${songs[currentSongIndex].name}`}
          </Typography.Title>
          <Icon
            color="white"
            onClick={() => setListSongVisible(true)}
            icon="material-symbols:library-music-rounded"
          />
          {/* <Typography.Text className={styles.time}>{`| ${Math.floor( */}
          {/*   currentTime / 60, */}
          {/* )}:${Math.floor(currentTime % 60)}`}</Typography.Text> */}
        </span>
      </div>
    </div>
  );
};

export default AudioPlayer;
