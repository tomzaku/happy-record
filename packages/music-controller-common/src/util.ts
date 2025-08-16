import {
  createGoogleDriveAudio,
  createRemoteAudio,
} from '@dreamer/audio-common';
import { TypeSound } from './enum';

const GOOGLE_DRIVER_ID_MAP: Record<TypeSound, string> = {
  [TypeSound.Bird]: '1WCVYMtEapn1c7W1agf-S1C7lEo-kZvWE',
  [TypeSound.Cricket]: '14A-qdMtH4TwxXBqk1WE5nC-Rt6vRXJLn',
  [TypeSound.Fireplace]: '1TOcnszHp8-7E5br6oQyHN5Is5DPjo_wW',
  [TypeSound.InterviewInACafe]: '16oQn9qVq_TB3QFwZT0pdZ8fFLrY-L4A8',
  [TypeSound.RainAndThunder]: '175tfLbBLjk2lkJdv7KkQWEgdZsgkd-QD',
  [TypeSound.Rain]: '1-jp1y5SfwgQE5BCtgj-WqmdxFPcAfNxg',
  [TypeSound.Wave]: '1_QZD5G0MumjTk_zRWdmYS4NQKvB0b1SG',
  [TypeSound.BusyCoffee]: '1-G6peXugBh0gkjckiSo2EQJGdtqeBTjl',
  [TypeSound.StreamRiver]: '10pHPZp-P-hTYBnHDYk8rPss3gom0rVRt',
};

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

const { sounds, toggleSound, setSoundVolume } =
  createRemoteAudio(GITHUB_ID_MAP);

export { toggleSound, setSoundVolume, sounds };
