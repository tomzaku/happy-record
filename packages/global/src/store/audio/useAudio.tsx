import { create } from 'zustand';
import { TypeSound, setSoundVolume } from '@dreamer/music-controller-common';

type AudioStore = {
  soundActiveId: Record<TypeSound, boolean>;
  volumeSound: Record<TypeSound, number>;
  setSoundActiveId: (soundActiveId: Record<TypeSound, boolean>) => void;
  setVolumeSound: (volumeSound: Record<TypeSound, number>) => void;
  updateSoundActive: (typeSound: TypeSound, isActive: boolean) => void;
  updateSoundVolume: (typeSound: TypeSound, volume: number) => void;
  isAnySoundActive: () => boolean;
  muteAllActiveSounds: () => void;
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  soundActiveId: {} as Record<TypeSound, boolean>,
  volumeSound: {} as Record<TypeSound, number>,
  
  setSoundActiveId: (soundActiveId: Record<TypeSound, boolean>) => {
    set({ soundActiveId });
  },
  
  setVolumeSound: (volumeSound: Record<TypeSound, number>) => {
    set({ volumeSound });
  },
  
  updateSoundActive: (typeSound: TypeSound, isActive: boolean) => {
    set((state) => ({
      soundActiveId: {
        ...state.soundActiveId,
        [typeSound]: isActive,
      },
    }));
  },
  
  updateSoundVolume: (typeSound: TypeSound, volume: number) => {
    set((state) => ({
      volumeSound: {
        ...state.volumeSound,
        [typeSound]: volume,
      },
    }));
  },
  
  isAnySoundActive: () => {
    const { soundActiveId } = get();
    return Object.values(soundActiveId).some(isActive => isActive);
  },
  
  muteAllActiveSounds: () => {
    const { soundActiveId } = get();
    const newVolumeSound = { ...get().volumeSound };
    
    // Set volume to 0 for all active sounds
    Object.keys(soundActiveId).forEach((typeSound) => {
      if (soundActiveId[typeSound as TypeSound]) {
        setSoundVolume(typeSound as TypeSound, 0);
        newVolumeSound[typeSound as TypeSound] = 0;
      }
    });
    
    set({ volumeSound: newVolumeSound });
  },
}));
