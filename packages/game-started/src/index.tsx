import React from 'react';
import { useThreeScene } from './hooks/useThreeScene';
import { useGameWorld } from './hooks/useGameWorld';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { defaultGameConfig, defaultKeyboardControls } from './config/gameConfig';
import styles from './index.module.scss';

const GameStarted = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = React.useState<'idle' | 'playing' | 'paused' | 'gameOver'>('idle');

  // Initialize Three.js scene
  const sceneSetup = useThreeScene(canvasRef);

  // Initialize game world (physics, entities)
  const gameWorld = useGameWorld(sceneSetup?.scene ?? null, defaultGameConfig);

  // Handle goal detection
  const handleGoal = React.useCallback((team: 'green' | 'red') => {
    console.log(`${team.toUpperCase()} WIN`);
    setGameState('gameOver');
  }, []);

  // Start game loop (only when everything is ready)
  useGameLoop({
    world: gameWorld?.world ?? null,
    scene: sceneSetup?.scene ?? null,
    camera: sceneSetup?.camera ?? null,
    renderer: sceneSetup?.renderer ?? null,
    ball: gameWorld?.ball ?? null,
    greenHandlers: gameWorld?.greenHandlers ?? [],
    greenMen: gameWorld?.greenMen ?? [],
    redHandlers: gameWorld?.redHandlers ?? [],
    redMen: gameWorld?.redMen ?? [],
    onGoal: handleGoal,
  });

  // Setup keyboard controls
  useKeyboardControls({
    greenHandlers: gameWorld?.greenHandlers ?? [],
    greenMen: gameWorld?.greenMen ?? [],
    redHandlers: gameWorld?.redHandlers ?? [],
    redMen: gameWorld?.redMen ?? [],
    controls: defaultKeyboardControls,
  });

  // Start game when everything is ready
  React.useEffect(() => {
    if (sceneSetup && gameWorld && gameState === 'idle') {
      setGameState('playing');
    }
  }, [sceneSetup, gameWorld, gameState]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
      />
    </div>
  );
};

export default GameStarted;
