import React, { useState, useCallback, useEffect } from 'react';

// import mySound from '@dreamer/audio-common/assets/baby/rockabye-baby-twinkle.mp3';
import IconPauseCircle from '@moon-ui/icon/IconPauseCircle';
import IconPlayCircle from '@moon-ui/icon/IconPlayCircle';

// Utils
import cx from 'classnames';

import styles from './index.module.scss';
import { githubGetLink } from '@dreamer/audio-common';
import Typography from '@moon-ui/typography';

type Props = {
  className?: string;
};
//
// const AUDIO_LINK = [
//   {
//     name: 'Date A Live Season 1 OST - Milk',
//     link: 'https://cdn.whyp.it/b47c9ff4-e4a5-4f88-8e54-b281affa0b90.mp3',
//   },
// ];

// const AudioLink = {
//   '1QDKacxHwChPX5Vi9ydDrVj5HeKG75nUg': {
//     name: 'rockabye-baby-twinkle-twinkle',
//     id: '1QDKacxHwChPX5Vi9ydDrVj5HeKG75nUg',
//   },
//   '1f4A5dmg8HxT89bphRbcd46zSgRoSuANR': {
//     name: 'twinkle-little-star-acoustic-guitar',
//     id: '1f4A5dmg8HxT89bphRbcd46zSgRoSuANR',
//   },
//   '1t5OCCanW7a_M18cOySVeJZsmhuPjz50I': {
//     name: 'date-a-live-season-1-ost',
//     id: '1t5OCCanW7a_M18cOySVeJZsmhuPjz50I',
//   },
// };

const AudioLink = {
  'date-a-live-season-1-ost.mp3': {
    name: 'date a live',
    id: 'date-a-live-season-1-ost.mp3',
  },
  'rockabye-baby-twinkle-twinkle.mp3': {
    name: 'rockabye baby twinkle twinkle',
    id: 'rockabye-baby-twinkle-twinkle.mp3',
  },
  'twinkle-twinkle-little-star-acoustic-guitar.mp3': {
    name: 'twinkle twinkle little star acoustic guitar',
    id: 'twinkle-twinkle-little-star-acoustic-guitar.mp3',
  },
  'einstein-baby-lullaby-academy-brahms.mp3': {
    name: 'Baby Lullaby Music - Einstein Baby Lullaby Academy',
    id: 'einstein-baby-lullaby-academy-brahms.mp3',
  },
  'einstein-baby-lullaby.mp3': {
    name: 'Einstein Baby Lullaby',
    id: 'einstein-baby-lullaby.mp3',
  },
  'piano-baby-lullabies-for-baby-sleep.mp3': {
    id: 'piano-baby-lullabies-for-baby-sleep.mp3',
    name: 'Piano Baby Lullabies for Baby Sleep',
  },
  'a-whole-new-world.mp3': {
    id: 'a-whole-new-world.mp3',
    name: 'A Whole New World',
  },
  'reflection.mp3': {
    id: 'reflection.mp3',
    name: 'Reflection',
  },
};

const useAudioPlayer = ({
  songList,
  autoPlayDefault = false,
}: {
  songList: string[];
  autoPlayDefault?: boolean;
}) => {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [autoPlay, setAutoPlay] = useState<boolean>(autoPlayDefault);
  const [currentTime, setCurrentTime] = useState<number>(0); // Add progress state
  const [duration, setDuration] = useState<number>(0); // Add duration state

  const next = useCallback(() => {
    const nextIndex = (currentSongIndex + 1) % songList.length;
    loadSong(nextIndex);
  }, [currentSongIndex, songList]);

  const prev = useCallback(() => {
    const prevIndex =
      (currentSongIndex - 1 + songList.length) % songList.length;
    loadSong(prevIndex);
  }, [currentSongIndex, songList]);

  const loadSong = useCallback(
    (index: number) => {
      if (index < 0 || index >= songList.length) return;

      const src = songList[index];
      const newAudio = new Audio(src);
      setAudio(newAudio);

      newAudio.onended = () => {
        if (autoPlay) {
          next();
        }
      };

      newAudio.ontimeupdate = () => {
        setCurrentTime(newAudio.currentTime);
        setDuration(newAudio.duration);
      };

      newAudio
        .play()
        .then(() => {
          setIsPlaying(true);
          setCurrentTime(0); // Reset progress when a new song starts
        })
        .catch(console.error);
      setCurrentSongIndex(index);
    },
    [songList, autoPlay, next]
  );

  const play = useCallback(() => {
    if (audio && !isPlaying) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  }, [audio, isPlaying]);

  const pause = useCallback(() => {
    if (audio && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  }, [audio, isPlaying]);

  useEffect(() => {
    if (audio) {
      audio.onended = () => {
        if (autoPlay) {
          next();
        }
      };
    }
  }, [audio, autoPlay, next]);

  return {
    loadSong,
    play,
    pause,
    isPlaying,
    autoPlay,
    setAutoPlay: (value: boolean) => setAutoPlay(value),
    next,
    prev,
    audio,
    currentTime,
    duration,
    currentSongIndex,
  };
};

//Make it shuffer array
const sufferList = (list: any[]) => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const songs = sufferList(Object.values(AudioLink));
const songList = songs.map(({ id }) => githubGetLink(id));

const AudioPlayer = ({ className }: Props) => {
  const {
    loadSong,
    play,
    pause,
    isPlaying,
    audio,
    currentTime,
    currentSongIndex,
    duration,
  } = useAudioPlayer({
    songList,
    autoPlayDefault: true,
  });

  React.useEffect(() => {
    loadSong(0);
  }, []);

  const togglePlay = () => {
    if (audio) {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    }
  };
  return (
    <div className={cx(styles.container, className)}>
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
