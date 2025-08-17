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

export { toggleSound, setSoundVolume, sounds, getActiveSounds, getSoundVolumes };
