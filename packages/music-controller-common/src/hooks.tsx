import { githubGetLink } from '@dreamer/audio-common';
import React from 'react';

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

const audioElements: HTMLAudioElement[] = [];

export const useAudioPlayer = ({
  songList: songListInitial = [],
  autoPlayDefault = false,
}: {
  songList?: any[];
  autoPlayDefault?: boolean;
}) => {
  const [songList, setSongList] = React.useState(songListInitial);
  const [audio, setAudio] = React.useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [currentSongIndex, setCurrentSongIndex] = React.useState<number>(0);
  const [autoPlay, setAutoPlay] = React.useState<boolean>(autoPlayDefault);
  const [currentTime, setCurrentTime] = React.useState<number>(0); // Add progress state
  const [duration, setDuration] = React.useState<number>(0); // Add duration state

  const next = React.useCallback(() => {
    const nextIndex = (currentSongIndex + 1) % songList.length;
    loadSong(nextIndex);
  }, [currentSongIndex, songList]);

  const prev = React.useCallback(() => {
    const prevIndex =
      (currentSongIndex - 1 + songList.length) % songList.length;
    loadSong(prevIndex);
  }, [currentSongIndex, songList]);

  const loadSong = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= songList.length) return;

      const src = songList[index];

      let newAudio: any;
      if (audioElements[index]) {
        newAudio = audioElements[index];
      } else {
        newAudio = new Audio(src);
      }
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
        callback(src, index)
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

    // Return all audio elements for later use if necessary
    return audioElements;
    // for (let index = 0; index < songList.length; index++) {
    //   const song = songList[index];
    //   const newAudio = new Audio(song);
    //
    //   // Create a promise that resolves when the audio metadata is loaded
    //   await new Promise<void>((resolve, reject) => {
    //     // Metadata includes info like duration, but not the full audio file
    //     newAudio.addEventListener('loadedmetadata', () => {
    //       resolve();
    //     });
    //
    //     // Handle load errors
    //     newAudio.addEventListener('error', () => {
    //       reject(`Failed to load song metadata: ${song}`);
    //     });
    //   });
    //
    //   // Invoke the callback once the metadata is loaded
    //   callback(song, index);
    // }
  };

  // Add the loadAllSongs method
  // const loadAllSongs1 = useCallback(
  //   (callback: (src: string, index: number) => void) => {
  //     songList.forEach((src, index) => {
  //       const newAudio = new Audio(src);
  //       newAudio.onloadeddata = () => {
  //         callback?.(src, index);
  //       };
  //       newAudio.onended = () => {
  //         if (autoPlay && index === currentSongIndex) {
  //           next();
  //         }
  //       };
  //
  //       newAudio.ontimeupdate = () => {
  //         if (index === currentSongIndex) {
  //           setCurrentTime(newAudio.currentTime);
  //           setDuration(newAudio.duration);
  //         }
  //       };
  //
  //       if (index === currentSongIndex) {
  //         setAudio(newAudio);
  //         newAudio
  //           .play()
  //           .then(() => {
  //             setIsPlaying(true);
  //             setCurrentTime(0);
  //           })
  //           .catch(console.error);
  //       }
  //     });
  //   },
  //   [songList, autoPlay, next, currentSongIndex]
  // );

  const play = React.useCallback(async () => {
    if (!audio) {
      loadSong(currentSongIndex);
    }
    const currentAudio = audioElements[currentSongIndex];
    if (currentAudio && !isPlaying) {
      currentAudio
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  }, [audio, isPlaying]);

  const pause = React.useCallback(() => {
    if (audio && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  }, [audio, isPlaying]);

  React.useEffect(() => {
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
