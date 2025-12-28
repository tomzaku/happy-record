import React from 'react';
import { useThreeScene } from './hooks/useThreeScene';
import { useGameWorld } from './hooks/useGameWorld';
import { useGameLoop } from './hooks/useGameLoop';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { defaultGameConfig, defaultKeyboardControls } from './config/gameConfig';
import HelpMenu from './components/HelpMenu';
import Countdown from './components/Countdown';
import { startBall } from './entities/Ball';
import styles from './index.module.scss';

const GameStarted = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = React.useState<'idle' | 'countdown' | 'playing' | 'paused' | 'gameOver'>('idle');
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [countdown, setCountdown] = React.useState(3);

  // Initialize Three.js scene
  const sceneSetup = useThreeScene(canvasRef);

  // Initialize game world (physics, entities)
  const gameWorld = useGameWorld(sceneSetup?.scene ?? null, defaultGameConfig);

  // Handle goal detection
  const handleGoal = React.useCallback((team: 'green' | 'red') => {
    console.log(`${team.toUpperCase()} WIN`);
    setGameState('gameOver');
  }, []);

  // Handle countdown complete
  const handleCountdownComplete = React.useCallback(() => {
    if (gameWorld?.ball) {
      startBall(gameWorld.ball);
    }
    setGameState('playing');
  }, [gameWorld?.ball]);

  // Restart game
  const handleRestart = React.useCallback(() => {
    gameWorld?.reset();
    setCountdown(3);
    setGameState('countdown');
  }, [gameWorld]);

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
    onRestart: handleRestart,
  });

  // Start countdown when everything is ready
  React.useEffect(() => {
    if (sceneSetup && gameWorld && gameState === 'idle') {
      setGameState('countdown');
    }
  }, [sceneSetup, gameWorld, gameState]);

  // Countdown timer
  React.useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown > 0) {
      const timer = window.setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
  }, [countdown, gameState]);

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
      />
      <HelpMenu isOpen={isHelpOpen} onToggle={() => setIsHelpOpen(!isHelpOpen)} />
      {gameState === 'countdown' && (
        <Countdown count={countdown} onComplete={handleCountdownComplete} />
      )}
    </div>
  );
};

export default GameStarted;
