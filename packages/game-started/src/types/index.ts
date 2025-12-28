import * as Three from 'three';
import * as Cannon from 'cannon-es';

export type GameEntity = {
  mesh: Three.Mesh;
  body: Cannon.Body;
};

export type PlayerRow = {
  handlers: GameEntity[];
  men: GameEntity[];
  constraints: Cannon.LockConstraint[];
};

export type GameState = 'idle' | 'playing' | 'paused' | 'gameOver';

export type GameResult = 'greenWin' | 'redWin' | null;

export type Team = 'green' | 'red';

export type GameConfig = {
  greenTeam: Array<{ numberOfMan: number; z: number }>;
  redTeam: Array<{ numberOfMan: number; z: number }>;
  ballInitialPosition: [number, number, number];
  ballInitialVelocity: [number, number, number];
};

export type KeyboardControls = {
  greenLeft: string;
  greenRight: string;
  greenRotateLeft: string;
  greenRotateRight: string;
  redLeft: string;
  redRight: string;
  redRotateLeft: string;
  redRotateRight: string;
};

