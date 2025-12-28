import { useEffect, useRef } from 'react';
import * as Three from 'three';
import * as Cannon from 'cannon-es';
import type { GameEntity } from '../types';
import { GROUND_LENGTH } from '../constants';
import {
  convertCannonPositionToThree,
  convertCannonQuaternionToThree,
} from '../utils/cannon';

type GameLoopOptions = {
  world: Cannon.World | null;
  scene: Three.Scene | null;
  camera: Three.PerspectiveCamera | null;
  renderer: Three.WebGLRenderer | null;
  ball: GameEntity | null;
  greenHandlers: GameEntity[];
  greenMen: GameEntity[];
  redHandlers: GameEntity[];
  redMen: GameEntity[];
  onGoal?: (team: 'green' | 'red') => void;
  gameState?: 'idle' | 'countdown' | 'playing' | 'paused' | 'gameOver';
};

export function useGameLoop({
  world,
  scene,
  camera,
  renderer,
  ball,
  greenHandlers,
  greenMen,
  redHandlers,
  redMen,
  onGoal,
  gameState,
}: GameLoopOptions) {
  const animationFrameId = useRef<number | null>(null);
  const isRunning = useRef(true);
  const goalScored = useRef(false);
  const gameStateRef = useRef(gameState);

  // Update gameState ref when it changes
  useEffect(() => {
    const previousState = gameStateRef.current;
    gameStateRef.current = gameState;
    
    // Reset goal flag when transitioning to countdown (new round starting)
    if (gameState === 'countdown' && previousState !== 'countdown') {
      goalScored.current = false;
    }
  }, [gameState]);

  useEffect(() => {
    if (!ball || !world || !scene || !camera || !renderer) return;

    function animate() {
      if (!isRunning.current) return;

      // Check for goals (only once per goal and only when playing)
      if (!goalScored.current && gameStateRef.current === 'playing') {
        const ballZ = ball.body.position.z;
        if (ballZ > GROUND_LENGTH / 2) {
          goalScored.current = true;
          onGoal?.('red');
        } else if (ballZ < -GROUND_LENGTH / 2) {
          goalScored.current = true;
          onGoal?.('green');
        }
      }

      // Update ball position
      ball.mesh.position.copy(
        convertCannonPositionToThree(ball.body.position)
      );
      ball.mesh.quaternion.copy(
        convertCannonQuaternionToThree(ball.body.quaternion)
      );

      // Update green team
      greenHandlers.forEach(handler => {
        handler.mesh.position.copy(
          convertCannonPositionToThree(handler.body.position)
        );
        handler.mesh.quaternion.copy(
          convertCannonQuaternionToThree(handler.body.quaternion)
        );
      });

      greenMen.forEach(man => {
        man.mesh.position.copy(convertCannonPositionToThree(man.body.position));
        man.mesh.quaternion.copy(
          convertCannonQuaternionToThree(man.body.quaternion)
        );
      });

      // Update red team
      redHandlers.forEach(handler => {
        handler.mesh.position.copy(
          convertCannonPositionToThree(handler.body.position)
        );
        handler.mesh.quaternion.copy(
          convertCannonQuaternionToThree(handler.body.quaternion)
        );
      });

      redMen.forEach(man => {
        man.mesh.position.copy(convertCannonPositionToThree(man.body.position));
        man.mesh.quaternion.copy(
          convertCannonQuaternionToThree(man.body.quaternion)
        );
      });

      // Render
      renderer.render(scene, camera);

      // Step physics simulation (60 FPS)
      world.step(1 / 60);

      animationFrameId.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      isRunning.current = false;
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [
    world,
    scene,
    camera,
    renderer,
    ball,
    greenHandlers,
    greenMen,
    redHandlers,
    redMen,
    onGoal,
  ]);
}

