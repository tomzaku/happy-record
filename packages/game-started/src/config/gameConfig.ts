import type { GameConfig, KeyboardControls } from '../types';
import { handlerZIndex } from '../utils/fieldLayout';

export const defaultGameConfig: GameConfig = {
  greenTeam: [
    { numberOfMan: 1, z: handlerZIndex[0] },
    { numberOfMan: 2, z: handlerZIndex[1] },
    { numberOfMan: 5, z: handlerZIndex[3] },
    { numberOfMan: 3, z: handlerZIndex[5] },
  ],
  redTeam: [
    { numberOfMan: 1, z: handlerZIndex[7] },
    { numberOfMan: 2, z: handlerZIndex[6] },
    { numberOfMan: 5, z: handlerZIndex[4] },
    { numberOfMan: 3, z: handlerZIndex[2] },
  ],
  ballInitialPosition: [0, 0.2, 0],
  ballInitialVelocity: [0, 0, 0], // Will be randomized
};

export const defaultKeyboardControls: KeyboardControls = {
  greenLeft: 'ArrowLeft',
  greenRight: 'ArrowRight',
  greenRotateLeft: ',',
  greenRotateRight: '.',
  redLeft: 'a',
  redRight: 'd',
  redRotateLeft: 'h',
  redRotateRight: 'j',
};

