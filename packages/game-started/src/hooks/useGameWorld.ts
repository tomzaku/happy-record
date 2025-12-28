import { useEffect, useRef, useState } from 'react';
import * as Cannon from 'cannon-es';
import * as Three from 'three';
import type { GameEntity, PlayerRow, GameConfig } from '../types';
import { createField } from '../entities/Field';
import { createBall, resetBall } from '../entities/Ball';
import { createPlayerRow } from '../entities/Player';

type InitialPosition = {
  position: Cannon.Vec3;
  quaternion: Cannon.Quaternion;
};

type GameWorld = {
  world: Cannon.World;
  ball: GameEntity | null;
  greenHandlers: GameEntity[];
  greenMen: GameEntity[];
  redHandlers: GameEntity[];
  redMen: GameEntity[];
  field: ReturnType<typeof createField>;
  reset: () => void;
};

export function useGameWorld(
  scene: Three.Scene | null,
  config: GameConfig
): GameWorld | null {
  const [gameWorld, setGameWorld] = useState<GameWorld | null>(null);
  const worldRef = useRef<Cannon.World | null>(null);

  useEffect(() => {
    if (!scene) return;

    // Create physics world
    const world = new Cannon.World({
      gravity: new Cannon.Vec3(0, -9.82, 0),
    });
    worldRef.current = world;

    // Create field
    const field = createField();
    scene.add(field.ground.mesh);
    world.addBody(field.ground.body);
    scene.add(field.floor.mesh);
    world.addBody(field.floor.body);
    field.walls.forEach(wall => {
      scene.add(wall.mesh);
      world.addBody(wall.body);
    });

    // Create ball (without initial velocity - will start after countdown)
    const ball = createBall(config.ballInitialPosition, false);
    scene.add(ball.mesh);
    world.addBody(ball.body);

    // Create green team
    const greenHandlers: GameEntity[] = [];
    const greenMen: GameEntity[] = [];
    const greenConstraints: Cannon.LockConstraint[] = [];
    const greenInitialPositions = new Map<Cannon.Body, InitialPosition>();

    config.greenTeam.forEach(({ numberOfMan, z }) => {
      const row = createPlayerRow({
        numberOfMan,
        z,
        teamColor: '#027902',
      });

      row.handlers.forEach(handler => {
        world.addBody(handler.body);
        scene.add(handler.mesh);
        greenHandlers.push(handler);
        greenInitialPositions.set(handler.body, {
          position: handler.body.position.clone(),
          quaternion: handler.body.quaternion.clone(),
        });
      });

      row.men.forEach(man => {
        world.addBody(man.body);
        scene.add(man.mesh);
        greenMen.push(man);
        greenInitialPositions.set(man.body, {
          position: man.body.position.clone(),
          quaternion: man.body.quaternion.clone(),
        });
      });

      row.constraints.forEach(constraint => {
        world.addConstraint(constraint);
        greenConstraints.push(constraint);
      });
    });

    // Create red team
    const redHandlers: GameEntity[] = [];
    const redMen: GameEntity[] = [];
    const redConstraints: Cannon.LockConstraint[] = [];
    const redInitialPositions = new Map<Cannon.Body, InitialPosition>();

    config.redTeam.forEach(({ numberOfMan, z }) => {
      const row = createPlayerRow({
        numberOfMan,
        z,
        teamColor: '#960000',
      });

      row.handlers.forEach(handler => {
        world.addBody(handler.body);
        scene.add(handler.mesh);
        redHandlers.push(handler);
        redInitialPositions.set(handler.body, {
          position: handler.body.position.clone(),
          quaternion: handler.body.quaternion.clone(),
        });
      });

      row.men.forEach(man => {
        world.addBody(man.body);
        scene.add(man.mesh);
        redMen.push(man);
        redInitialPositions.set(man.body, {
          position: man.body.position.clone(),
          quaternion: man.body.quaternion.clone(),
        });
      });

      row.constraints.forEach(constraint => {
        world.addConstraint(constraint);
        redConstraints.push(constraint);
      });
    });

    const reset = () => {
      // Reset ball
      if (ball) {
        resetBall(ball, config.ballInitialPosition);
      }

      // Reset green team positions
      greenHandlers.forEach(handler => {
        const initial = greenInitialPositions.get(handler.body);
        if (initial) {
          handler.body.position.copy(initial.position);
          handler.body.quaternion.copy(initial.quaternion);
          handler.body.velocity.set(0, 0, 0);
          handler.body.angularVelocity.set(0, 0, 0);
        }
      });
      greenMen.forEach(man => {
        const initial = greenInitialPositions.get(man.body);
        if (initial) {
          man.body.position.copy(initial.position);
          man.body.quaternion.copy(initial.quaternion);
          man.body.velocity.set(0, 0, 0);
          man.body.angularVelocity.set(0, 0, 0);
        }
      });

      // Reset red team positions
      redHandlers.forEach(handler => {
        const initial = redInitialPositions.get(handler.body);
        if (initial) {
          handler.body.position.copy(initial.position);
          handler.body.quaternion.copy(initial.quaternion);
          handler.body.velocity.set(0, 0, 0);
          handler.body.angularVelocity.set(0, 0, 0);
        }
      });
      redMen.forEach(man => {
        const initial = redInitialPositions.get(man.body);
        if (initial) {
          man.body.position.copy(initial.position);
          man.body.quaternion.copy(initial.quaternion);
          man.body.velocity.set(0, 0, 0);
          man.body.angularVelocity.set(0, 0, 0);
        }
      });
    };

    setGameWorld({
      world,
      ball,
      greenHandlers,
      greenMen,
      redHandlers,
      redMen,
      field,
      reset,
    });

    return () => {
      // Cleanup
      if (worldRef.current) {
        // Remove all bodies and constraints
        worldRef.current.bodies.forEach(body => {
          worldRef.current?.removeBody(body);
        });
        worldRef.current.constraints.forEach(constraint => {
          worldRef.current?.removeConstraint(constraint);
        });
      }
    };
  }, [scene, config]);

  return gameWorld;
}

