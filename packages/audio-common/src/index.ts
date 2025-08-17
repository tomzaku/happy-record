export const githubGetLink = (id: string) => {
  return `https://raw.githubusercontent.com/zTwist201/audio/main/${id}`;
  // return `https://github.com/zTwist201/audio/raw/main/${id}`;
};

export const getLocalLink = async (id: string) => {
  const SongSourceMap: Record<string, string> = {
    // 'date-a-live-season-1-ost.mp3': DateALiveSeason1Ost,
    // 'rockabye-baby-twinkle-twinkle.mp3': RockabyeBabyTwinkle,
    // 'twinkle-twinkle-little-star-acoustic-guitar.mp3': TwinkleLittleStart,
    // 'einstein-baby-lullaby-academy-brahms.mp3':
    //   EinsteinBabyLullabyAcademyBrahms,
    // 'einstein-baby-lullaby.mp3': EinsteinBabyLullaby,
    // 'piano-baby-lullabies-for-baby-sleep.mp3': PianoBabyLullaby,
    // 'a-whole-new-world.mp3': AWholeNewWorld,
    // 'reflection.mp3': Reflection,
  };
  // // lazy import
  // // import source from `../asset/${id}`;
  // // const source = await import(`../asset/${id}`);
  // const assets = import.meta.glob('../asset/*.mp3', { eager: true });
  //
  // // const source = require(`../asset/${id}`);
  // // return source;
  // // Construct the path to the file
  // const filePath = `../asset/${id}`;
  //
  // // Return the file if it exists
  // return (assets[filePath] as any)?.default || null;
  return SongSourceMap[id];
};

// export const githubGetLink = (id: string) => {
//   return `https://github.com/zTwist201/audio/raw/main/${id}`;
// };
//
export const googleDriveGetLink = (id: string) => {
  return `https://drive.google.com/uc?export=download&id=${id}`;
};

const GAP_SOUND_SECOND = 2.5; // Start next iteration 2.5 seconds before end
const FADE_DURATION = 2.0; // Volume fade duration in seconds

export const createBasedAudio = <T extends string>(
  audioMap: Record<T, string>,
  getLink: (id: string) => string,
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
  const loopStates: Record<string, boolean> = {};
  const originalVolumes: Record<string, number> = {}; // Store original volume levels
  const crossfadeSounds: Record<string, HTMLAudioElement> = {}; // Second audio for crossfade
  const crossfadeStates: Record<string, boolean> = {}; // Track crossfade sound states
  
  const loadTypeSound = async (typeSound: T) => {
    return new Audio(getLink(audioMap[typeSound]));
  };
  
  const toggleSound = async (
    typeSound: T,
    toggleValue: boolean,
    options?: { loop?: boolean },
  ) => {
    if (!sounds[typeSound]) {
      const sound = await loadTypeSound(typeSound);
      sounds[typeSound] = sound;
      
      // Create crossfade sound instance
      const crossfadeSound = await loadTypeSound(typeSound);
      crossfadeSounds[typeSound] = crossfadeSound;
      crossfadeStates[typeSound] = false;
      
      // Set up seamless looping with dual-audio crossfade
      sound.addEventListener('timeupdate', () => {
        if (loopStates[typeSound] && sound.duration > 0) {
          const timeLeft = sound.duration - sound.currentTime;
          
          // Start crossfade sound 2 seconds before main sound ends
          if (timeLeft <= FADE_DURATION && !crossfadeStates[typeSound]) {
            crossfadeSound.currentTime = sound.duration - FADE_DURATION;
            crossfadeSound.volume = 0;
            crossfadeSound.play().catch(console.error);
            crossfadeStates[typeSound] = true;
          }
          
          // Volume fade out for main sound in last 2 seconds
          if (timeLeft <= FADE_DURATION) {
            const fadeProgress = timeLeft / FADE_DURATION;
            const targetVolume = originalVolumes[typeSound] || 1;
            sound.volume = targetVolume * fadeProgress;
            
            // Simultaneously fade in crossfade sound
            const crossfadeProgress = 1 - fadeProgress;
            crossfadeSound.volume = targetVolume * crossfadeProgress;
          }
          
          // Check if we're 2.5 seconds away from the end
          if (sound.currentTime >= sound.duration - GAP_SOUND_SECOND) {
            // Reset main sound to beginning
            sound.currentTime = 0;
            sound.volume = originalVolumes[typeSound] || 1;
            
            // Stop crossfade sound and reset
            crossfadeSound.pause();
            crossfadeSound.currentTime = 0;
            crossfadeStates[typeSound] = false;
          }
        }
      });
    }
    
    if (toggleValue) {
      if (options?.loop) {
        loopStates[typeSound] = true;
        // Don't use native loop to avoid gaps
        sounds[typeSound].loop = false;
        if (crossfadeSounds[typeSound]) {
          crossfadeSounds[typeSound].loop = false;
        }
      } else {
        loopStates[typeSound] = false;
        // Stop crossfade sound when main sound stops
        if (crossfadeSounds[typeSound]) {
          crossfadeSounds[typeSound].pause();
          crossfadeStates[typeSound] = false;
        }
      }
      sounds[typeSound].play();
    } else {
      loopStates[typeSound] = false;
      sounds[typeSound].pause();
      // Stop crossfade sound
      if (crossfadeSounds[typeSound]) {
        crossfadeSounds[typeSound].pause();
        crossfadeStates[typeSound] = false;
      }
    }
  };
  
  const setSoundVolume = async (typeSound: T, volume: number) => {
    if (!sounds[typeSound]) {
      return;
    }
    // Store original volume for crossfade calculations
    originalVolumes[typeSound] = volume;
    sounds[typeSound].volume = volume;
    // Also set volume on crossfade sound
    if (crossfadeSounds[typeSound]) {
      crossfadeSounds[typeSound].volume = volume;
    }
  };
  
  const loadSounds = async (typeSounds: T[] = Object.keys(audioMap) as T[]) => {
    const result = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      sounds[typeSound] = result[index];
    });
    
    // Also load crossfade sounds
    const crossfadeResults = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      crossfadeSounds[typeSound] = crossfadeResults[index];
      crossfadeStates[typeSound] = false;
    });
  };
  
  return {
    toggleSound,
    setSoundVolume,
    sounds,
    loadSounds,
    // Add functions to get current state
    getActiveSounds: (): Record<T, boolean> => {
      const activeSounds: Record<T, boolean> = {} as Record<T, boolean>;
      Object.keys(sounds).forEach(typeSound => {
        activeSounds[typeSound as T] = sounds[typeSound] && !sounds[typeSound].paused;
      });
      return activeSounds;
    },
    getSoundVolumes: (): Record<T, number> => {
      const soundVolumes: Record<T, number> = {} as Record<T, number>;
      Object.keys(sounds).forEach(typeSound => {
        soundVolumes[typeSound as T] = sounds[typeSound] ? sounds[typeSound].volume : 1;
      });
      return soundVolumes;
    },
  };
};

export const createGoogleDriveAudio = <T extends string>(
  googleDriverIdMap: Record<T, string>,
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
  const loopStates: Record<string, boolean> = {};
  const originalVolumes: Record<string, number> = {}; // Store original volume levels
  const crossfadeSounds: Record<string, HTMLAudioElement> = {}; // Second audio for crossfade
  const crossfadeStates: Record<string, boolean> = {}; // Track crossfade sound states
  
  const loadTypeSound = async (typeSound: T) => {
    return new Audio(
      `https://drive.google.com/uc?export=download&id=${googleDriverIdMap[typeSound]}`,
    );
  };
  
  const toggleSound = async (
    typeSound: T,
    toggleValue: boolean,
    options?: { loop?: boolean },
  ) => {
    if (!sounds[typeSound]) {
      const sound = await loadTypeSound(typeSound);
      sounds[typeSound] = sound;
      
      // Create crossfade sound instance
      const crossfadeSound = await loadTypeSound(typeSound);
      crossfadeSounds[typeSound] = crossfadeSound;
      crossfadeStates[typeSound] = false;
      
      // Set up seamless looping with dual-audio crossfade
      sound.addEventListener('timeupdate', () => {
        if (loopStates[typeSound] && sound.duration > 0) {
          const timeLeft = sound.duration - sound.currentTime;
          
          // Start crossfade sound 2 seconds before main sound ends
          if (timeLeft <= FADE_DURATION && !crossfadeStates[typeSound]) {
            crossfadeSound.currentTime = sound.duration - FADE_DURATION;
            crossfadeSound.volume = 0;
            crossfadeSound.play().catch(console.error);
            crossfadeStates[typeSound] = true;
          }
          
          // Volume fade out for main sound in last 2 seconds
          if (timeLeft <= FADE_DURATION) {
            const fadeProgress = timeLeft / FADE_DURATION;
            const targetVolume = originalVolumes[typeSound] || 1;
            sound.volume = targetVolume * fadeProgress;
            
            // Simultaneously fade in crossfade sound
            const crossfadeProgress = 1 - fadeProgress;
            crossfadeSound.volume = targetVolume * crossfadeProgress;
          }
          
          // Check if we're 2.5 seconds away from the end
          if (sound.currentTime >= sound.duration - GAP_SOUND_SECOND) {
            // Reset main sound to beginning
            sound.currentTime = 0;
            sound.volume = originalVolumes[typeSound] || 1;
            
            // Stop crossfade sound and reset
            crossfadeSound.pause();
            crossfadeSound.currentTime = 0;
            crossfadeStates[typeSound] = false;
          }
        }
      });
    }
    
    if (toggleValue) {
      if (options?.loop) {
        loopStates[typeSound] = true;
        // Don't use native loop to avoid gaps
        sounds[typeSound].loop = false;
        if (crossfadeSounds[typeSound]) {
          crossfadeSounds[typeSound].loop = false;
        }
      } else {
        loopStates[typeSound] = false;
        // Stop crossfade sound when main sound stops
        if (crossfadeSounds[typeSound]) {
          crossfadeSounds[typeSound].pause();
          crossfadeStates[typeSound] = false;
        }
      }
      sounds[typeSound].play();
    } else {
      loopStates[typeSound] = false;
      sounds[typeSound].pause();
      // Stop crossfade sound
      if (crossfadeSounds[typeSound]) {
        crossfadeSounds[typeSound].pause();
        crossfadeStates[typeSound] = false;
      }
    }
  };
  
  const setSoundVolume = async (typeSound: T, volume: number) => {
    if (!sounds[typeSound]) {
      return;
    }
    // Store original volume for crossfade calculations
    originalVolumes[typeSound] = volume;
    sounds[typeSound].volume = volume;
    // Also set volume on crossfade sound
    if (crossfadeSounds[typeSound]) {
      crossfadeSounds[typeSound].volume = volume;
    }
  };
  
  const loadSounds = async (
    typeSounds: T[] = Object.keys(googleDriverIdMap) as T[],
  ) => {
    const result = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      sounds[typeSound] = result[index];
    });
    
    // Also load crossfade sounds
    const crossfadeResults = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      crossfadeSounds[typeSound] = crossfadeResults[index];
      crossfadeStates[typeSound] = false;
    });
  };
  
  return {
    toggleSound,
    setSoundVolume,
    sounds,
    loadSounds,
    // Add functions to get current state
    getActiveSounds: (): Record<T, boolean> => {
      const activeSounds: Record<T, boolean> = {} as Record<T, boolean>;
      Object.keys(sounds).forEach(typeSound => {
        activeSounds[typeSound as T] = sounds[typeSound] && !sounds[typeSound].paused;
      });
      return activeSounds;
    },
    getSoundVolumes: (): Record<T, number> => {
      const soundVolumes: Record<T, number> = {} as Record<T, number>;
      Object.keys(sounds).forEach(typeSound => {
        soundVolumes[typeSound as T] = sounds[typeSound] ? sounds[typeSound].volume : 1;
      });
      return soundVolumes;
    },
  };
};

export const createRemoteAudio = <T extends string>(
  idMap: Record<T, string>,
  getLink = typeSound => githubGetLink(idMap[typeSound]),
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
  const loopStates: Record<string, boolean> = {};
  const originalVolumes: Record<string, number> = {}; // Store original volume levels
  const crossfadeSounds: Record<string, HTMLAudioElement> = {}; // Second audio for crossfade
  const crossfadeStates: Record<string, boolean> = {}; // Track crossfade sound states
  
  const loadTypeSound = async (typeSound: T) => {
    return new Audio(getLink(typeSound));
  };
  
  const toggleSound = async (
    typeSound: T,
    toggleValue: boolean,
    options?: { loop?: boolean },
  ) => {
    if (!sounds[typeSound]) {
      const sound = await loadTypeSound(typeSound);
      sounds[typeSound] = sound;
      
      // Create crossfade sound instance
      const crossfadeSound = await loadTypeSound(typeSound);
      crossfadeSounds[typeSound] = crossfadeSound;
      crossfadeStates[typeSound] = false;
      
      // Set up seamless looping with dual-audio crossfade
      sound.addEventListener('timeupdate', () => {
        if (loopStates[typeSound] && sound.duration > 0) {
          const timeLeft = sound.duration - sound.currentTime;
          
          // Start crossfade sound 2 seconds before main sound ends
          if (timeLeft <= FADE_DURATION && !crossfadeStates[typeSound]) {
            crossfadeSound.currentTime = sound.duration - FADE_DURATION;
            crossfadeSound.volume = 0;
            crossfadeSound.play().catch(console.error);
            crossfadeStates[typeSound] = true;
          }
          
          // Volume fade out for main sound in last 2 seconds
          if (timeLeft <= FADE_DURATION) {
            const fadeProgress = timeLeft / FADE_DURATION;
            const targetVolume = originalVolumes[typeSound] || 1;
            sound.volume = targetVolume * fadeProgress;
            
            // Simultaneously fade in crossfade sound
            const crossfadeProgress = 1 - fadeProgress;
            crossfadeSound.volume = targetVolume * crossfadeProgress;
          }
          
          // Check if we're 2.5 seconds away from the end
          if (sound.currentTime >= sound.duration - GAP_SOUND_SECOND) {
            // Reset main sound to beginning
            sound.currentTime = 0.5;
            sound.volume = originalVolumes[typeSound] || 1;
            
            // Stop crossfade sound and reset
            crossfadeSound.pause();
            crossfadeSound.currentTime = 0;
            crossfadeStates[typeSound] = false;
          }
        }
      });
    }
    
    if (toggleValue) {
      if (options?.loop) {
        loopStates[typeSound] = true;
        // Don't use native loop to avoid gaps
        sounds[typeSound].loop = false;
        if (crossfadeSounds[typeSound]) {
          crossfadeSounds[typeSound].loop = false;
        }
      } else {
        loopStates[typeSound] = false;
        // Stop crossfade sound when main sound stops
        if (crossfadeSounds[typeSound]) {
          crossfadeSounds[typeSound].pause();
          crossfadeStates[typeSound] = false;
        }
      }
      sounds[typeSound].play();
    } else {
      loopStates[typeSound] = false;
      sounds[typeSound].pause();
      // Stop crossfade sound
      if (crossfadeSounds[typeSound]) {
        crossfadeSounds[typeSound].pause();
        crossfadeStates[typeSound] = false;
      }
    }
  };
  
  const setSoundVolume = async (typeSound: T, volume: number) => {
    if (!sounds[typeSound]) {
      return;
    }
    // Store original volume for crossfade calculations
    originalVolumes[typeSound] = volume;
    sounds[typeSound].volume = volume;
    // Also set volume on crossfade sound
    if (crossfadeSounds[typeSound]) {
      crossfadeSounds[typeSound].volume = volume;
    }
  };
  
  const loadSounds = async (typeSounds: T[] = Object.keys(idMap) as T[]) => {
    const result = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      sounds[typeSound] = result[index];
    });
    
    // Also load crossfade sounds
    const crossfadeResults = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      crossfadeSounds[typeSound] = crossfadeResults[index];
      crossfadeStates[typeSound] = false;
    });
  };
  
  return {
    toggleSound,
    setSoundVolume,
    sounds,
    loadSounds,
    // Add functions to get current state
    getActiveSounds: (): Record<T, boolean> => {
      const activeSounds: Record<T, boolean> = {} as Record<T, boolean>;
      Object.keys(sounds).forEach(typeSound => {
        activeSounds[typeSound as T] = sounds[typeSound] && !sounds[typeSound].paused;
      });
      return activeSounds;
    },
    getSoundVolumes: (): Record<T, number> => {
      const soundVolumes: Record<T, number> = {} as Record<T, number>;
      Object.keys(sounds).forEach(typeSound => {
        soundVolumes[typeSound as T] = sounds[typeSound] ? sounds[typeSound].volume : 1;
      });
      return soundVolumes;
    },
  };
};
