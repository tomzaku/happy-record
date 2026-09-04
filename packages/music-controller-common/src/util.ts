import {
  createRemoteAudio,
} from '@dreamer/audio-common';
import { TypeSound } from './enum';

const GITHUB_ID_MAP: Record<TypeSound, string> = {
  [TypeSound.Bird]: '/focus/bird.mp3',
  [TypeSound.Cricket]: '/focus/cricket.mp3',
  [TypeSound.Fireplace]: '/focus/fire.mp3',
  [TypeSound.InterviewInACafe]: '/focus/cafe.mp3',
  [TypeSound.RainAndThunder]: '/focus/thunder.mp3',
  [TypeSound.Rain]: '/focus/rain.mp3',
  [TypeSound.Wave]: '/focus/wave.mp3',
  [TypeSound.BusyCoffee]: '/focus/coffee-shop.mp3',
  [TypeSound.StreamRiver]: '/focus/stream.mp3',
  [TypeSound.LofiAfrobeatBurna]: '/focus/lofi-afrobeat-burna.mp3',
  [TypeSound.LofiHiphop]: '/focus/lofi-hiphop.mp3',
  [TypeSound.LofiSideBySide]: '/focus/lofi-side-by-side.mp3',
};

const { sounds, toggleSound, setSoundVolume, getActiveSounds, getSoundVolumes } =
  createRemoteAudio(GITHUB_ID_MAP);

// Stops every currently-playing sound at once — the one "mute all" operation, shared by every
// caller that needs it (MusicSoundPicker's own row, the Focus Zone header's mute button,
// useFocusZoneTheme's own exclusive-switch-between-presets behavior) instead of each
// reimplementing the same "loop the active ones, toggle each off" logic.
const stopAllSounds = () => {
  const active = getActiveSounds();
  (Object.keys(active) as TypeSound[]).forEach(typeSound => {
    if (active[typeSound]) toggleSound(typeSound, false);
  });
};

export { toggleSound, setSoundVolume, sounds, getActiveSounds, getSoundVolumes, stopAllSounds };
