import { githubGetLink } from '@dreamer/audio-common';
import React from 'react';
import { create } from 'zustand';

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
  'a-whole-new-world.mp3': {
    id: 'a-whole-new-world.mp3',
    name: 'A Whole New World',
  },
  'reflection.mp3': {
    id: 'reflection.mp3',
    name: 'Reflection',
  },
  'arabesque-piano-relaxation.mp3': {
    id: 'arabesque-piano-relaxation.mp3',
    name: 'Arabesque Piano Relaxation',
  },
  'canon-in-d.mp3': {
    id: 'canon-in-d.mp3',
    name: 'Canon in D',
  },
  'music-therapy-serenity.mp3': {
    id: 'music-therapy-serenity.mp3',
    name: 'Music Therapy - Serenity',
  },
  'prelude-in-c-major.mp3': {
    id: 'prelude-in-c-major.mp3',
    name: 'Prelude in C Major',
  },
};

const useGlobalAudioPlayer = create<{
  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;
  currentSongIndex: number;
  setCurrentSongIndex: (value: number) => void;
  songList: any[];
  setSongList: (value: any[]) => void;
  currentTime: number;
  setCurrentTime: (value: number) => void;
  duration: number;
  setDuration: (value: number) => void;
}>(set => ({
  isPlaying: false,
  setIsPlaying: (value: boolean) => set({ isPlaying: value }),
  currentSongIndex: 0,
  setCurrentSongIndex: (value: number) => set({ currentSongIndex: value }),
  songList: [],
  setSongList: (value: any[]) => set({ songList: value }),
  currentTime: 0,
  setCurrentTime: (value: number) => set({ currentTime: value }),
  duration: 0,
  setDuration: (value: number) => set({ duration: value }),
}));

const audioElements: HTMLAudioElement[] = [];

export const useAudioPlayer = ({
  autoPlayDefault = false,
}: {
  autoPlayDefault?: boolean;
}) => {
  const {
    isPlaying,
    songList,
    setSongList,
    setIsPlaying,
    currentSongIndex,
    setCurrentSongIndex,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
  } = useGlobalAudioPlayer();
  const [autoPlay, setAutoPlay] = React.useState<boolean>(autoPlayDefault);
  const audioRef = React.useRef<HTMLAudioElement | null>(audioElements?.[currentSongIndex]);

  const next = (songIndex?: number) => {
    // Stop the current song and play another song
    console.log('currentSingIndex', currentSongIndex, songList.length);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    let nextIndex = (currentSongIndex + 1) % songList.length;
    if (songIndex && !isNaN(songIndex)) {
      nextIndex = songIndex;
    }
    console.log('nextIndex', nextIndex);
    setCurrentSongIndex(nextIndex);
    loadSong(nextIndex);
  };

  const prev = () => {
    // Stop the current song and play another song
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const prevIndex =
      (currentSongIndex - 1 + songList.length) % songList.length;
    loadSong(prevIndex);
    setCurrentSongIndex(prevIndex);
  };

  const loadSong = (index: number) => {
    if (index < 0 || index >= songList.length) return;

    const src = songList[index];

    let newAudio: any;
    console.log('AUTO PLAY', autoPlay);
    if (audioElements[index]) {
      newAudio = audioElements[index];
      newAudio.currentTime = 0;
    } else {
      newAudio = new Audio(src);
    }
    audioRef.current = newAudio;

    newAudio.onended = () => {
      console.log('AUDIO END!!!', autoPlay);
      if (autoPlay) {
        next(index + 1);
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
  };
  const loadAllSongs = async ({
    songs,
    callback,
  }: {
    songs: any[];
    callback: (src: string, index: number) => void;
  }) => {
    // differ songs compare to songList
    const differSongs = songs.filter(song => !songList.includes(song));
    const finalSongs = [...songList, ...differSongs];
    if (differSongs.length) {
      setSongList(finalSongs);
    }

    for (let index = 0; index < finalSongs.length; index++) {
      const src = finalSongs[index];

      if (audioElements[index]) {
        callback(src, index);
        continue;
      }

      // const src = URL.createObjectURL(file); // Convert local file to an Object URL

      const newAudio = new Audio(src);
      audioElements.push(newAudio); // Store each audio element

      // Load each song's metadata before resolving
      await new Promise<void>((resolve, reject) => {
        newAudio.addEventListener('loadedmetadata', () => {
          callback(src, index);
          resolve();
        });

        newAudio.addEventListener('error', e => {
          console.error(`Error loading song: ${src}`, e);
          reject(e);
        });
      });
    }

    return audioElements;
  };

  const play = async () => {
    if (!audioRef.current) {
      loadSong(currentSongIndex);
      setIsPlaying(true);
    } else {
      const currentAudio = audioElements[currentSongIndex];
      if (currentAudio && !isPlaying) {
        currentAudio
          .play()
          .then(() => setIsPlaying(true))
          .catch(console.error);
      }
    }
  };

  const pause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return {
    loadSong,
    play,
    pause,
    isPlaying,
    autoPlay,
    setAutoPlay: (value: boolean) => setAutoPlay(value),
    next,
    prev,
    audio: audioRef.current,
    currentTime,
    duration,
    currentSongIndex,
    loadAllSongs,
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

export const songs = sufferList(Object.values(AudioLink));
export const songList = songs.map(({ id }) => githubGetLink(id));
