import { create } from 'zustand';
import { TypeSound, setSoundVolume } from '@dreamer/music-controller-common';

type AudioStore = {
  soundActiveId: Record<TypeSound, boolean>;
  volumeSound: Record<TypeSound, number>;
  previousVolumeSound: Record<TypeSound, number>;
  setSoundActiveId: (soundActiveId: Record<TypeSound, boolean>) => void;
  setVolumeSound: (volumeSound: Record<TypeSound, number>) => void;
  updateSoundActive: (typeSound: TypeSound, isActive: boolean) => void;
  updateSoundVolume: (typeSound: TypeSound, volume: number) => void;
  isAnySoundActive: () => boolean;
  isAnySoundMuted: () => boolean;
  muteAllActiveSounds: () => void;
  unmuteAllActiveSounds: () => void;
};

export const useAudioStore = create<AudioStore>((set, get) => ({
  soundActiveId: {} as Record<TypeSound, boolean>,
  volumeSound: {} as Record<TypeSound, number>,
  previousVolumeSound: {} as Record<TypeSound, number>,
  
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
  
  isAnySoundMuted: () => {
    const { soundActiveId, volumeSound } = get();
    return Object.keys(soundActiveId).some((typeSound) => {
      return soundActiveId[typeSound as TypeSound] && volumeSound[typeSound as TypeSound] === 0;
    });
  },
  
  muteAllActiveSounds: () => {
    const { soundActiveId, volumeSound } = get();
    const newVolumeSound = { ...volumeSound };
    const newPreviousVolumeSound = { ...get().previousVolumeSound };
    
    // Store previous volumes and set current volumes to 0 for all active sounds
    Object.keys(soundActiveId).forEach((typeSound) => {
      if (soundActiveId[typeSound as TypeSound]) {
        // Store the current volume as previous volume
        newPreviousVolumeSound[typeSound as TypeSound] = volumeSound[typeSound as TypeSound] || 0;
        // Set current volume to 0
        setSoundVolume(typeSound as TypeSound, 0);
        newVolumeSound[typeSound as TypeSound] = 0;
      }
    });
    
    set({ 
      volumeSound: newVolumeSound,
      previousVolumeSound: newPreviousVolumeSound
    });
  },
  
  unmuteAllActiveSounds: () => {
    const { soundActiveId, previousVolumeSound } = get();
    const newVolumeSound = { ...get().volumeSound };
    
    // Restore previous volumes for all active sounds
    Object.keys(soundActiveId).forEach((typeSound) => {
      if (soundActiveId[typeSound as TypeSound]) {
        const previousVolume = previousVolumeSound[typeSound as TypeSound] || 0;
        setSoundVolume(typeSound as TypeSound, previousVolume);
        newVolumeSound[typeSound as TypeSound] = previousVolume;
      }
    });
    
    set({ volumeSound: newVolumeSound });
  },
}));
