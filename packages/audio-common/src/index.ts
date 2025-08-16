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

export const createBasedAudio = <T extends string>(
  audioMap: Record<T, string>,
  getLink: (id: string) => string,
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
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
    }
    if (toggleValue) {
      if (options?.loop) {
        sounds[typeSound].loop = true;
      }
      sounds[typeSound].play();
    } else {
      sounds[typeSound].pause();
    }
  };
  const setSoundVolume = async (typeSound: T, volume: number) => {
    if (!sounds[typeSound]) {
      return;
    }
    sounds[typeSound].volume = volume;
  };
  const loadSounds = async (typeSounds: T[] = Object.keys(audioMap) as T[]) => {
    const result = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      sounds[typeSound] = result[index];
    });
  };
  return {
    toggleSound,
    setSoundVolume,
    sounds,
    loadSounds,
  };
};

export const createGoogleDriveAudio = <T extends string>(
  googleDriverIdMap: Record<T, string>,
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
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
    }
    if (toggleValue) {
      if (options?.loop) {
        sounds[typeSound].loop = true;
      }
      sounds[typeSound].play();
    } else {
      sounds[typeSound].pause();
    }
  };
  const setSoundVolume = async (typeSound: T, volume: number) => {
    if (!sounds[typeSound]) {
      return;
    }
    sounds[typeSound].volume = volume;
  };
  const loadSounds = async (
    typeSounds: T[] = Object.keys(googleDriverIdMap) as T[],
  ) => {
    const result = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      sounds[typeSound] = result[index];
    });
  };
  return {
    toggleSound,
    setSoundVolume,
    sounds,
    loadSounds,
  };
};

export const createRemoteAudio = <T extends string>(
  idMap: Record<T, string>,
  getLink = typeSound => githubGetLink(idMap[typeSound]),
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
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
    }
    if (toggleValue) {
      if (options?.loop) {
        sounds[typeSound].loop = true;
      }
      sounds[typeSound].play();
    } else {
      sounds[typeSound].pause();
    }
  };
  const setSoundVolume = async (typeSound: T, volume: number) => {
    if (!sounds[typeSound]) {
      return;
    }
    sounds[typeSound].volume = volume;
  };
  const loadSounds = async (
    typeSounds: T[] = Object.keys(googleDriverIdMap) as T[],
  ) => {
    const result = await Promise.all(typeSounds.map(loadTypeSound));
    typeSounds.forEach((typeSound, index) => {
      sounds[typeSound] = result[index];
    });
  };
  return {
    toggleSound,
    setSoundVolume,
    sounds,
    loadSounds,
  };
};
