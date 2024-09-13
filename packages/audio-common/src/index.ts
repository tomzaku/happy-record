export const githubGetLink = (id: string) => {
  return `https://raw.githubusercontent.com/zTwist201/audio/main/${id}`;
  // return `https://github.com/zTwist201/audio/raw/main/${id}`;
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
  getLink: (id: string) => string
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
  const loadTypeSound = async (typeSound: T) => {
    return new Audio(getLink(audioMap[typeSound]));
  };
  const toggleSound = async (
    typeSound: T,
    toggleValue: boolean,
    options?: { loop?: boolean }
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
  googleDriverIdMap: Record<T, string>
) => {
  const sounds: Record<string, HTMLAudioElement> = {};
  const loadTypeSound = async (typeSound: T) => {
    return new Audio(
      `https://drive.google.com/uc?export=download&id=${googleDriverIdMap[typeSound]}`
    );
  };
  const toggleSound = async (
    typeSound: T,
    toggleValue: boolean,
    options?: { loop?: boolean }
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
    typeSounds: T[] = Object.keys(googleDriverIdMap) as T[]
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
