import { useEffect, useRef, useState } from 'react';
import * as Cannon from 'cannon-es';
import * as Three from 'three';
import type { GameEntity, PlayerRow, GameConfig } from '../types';
import { createField } from '../entities/Field';
import { createBall, resetBall } from '../entities/Ball';
import { createPlayerRow } from '../entities/Player';

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
      });

      row.men.forEach(man => {
        world.addBody(man.body);
        scene.add(man.mesh);
        greenMen.push(man);
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
      });

      row.men.forEach(man => {
        world.addBody(man.body);
        scene.add(man.mesh);
        redMen.push(man);
      });

      row.constraints.forEach(constraint => {
        world.addConstraint(constraint);
        redConstraints.push(constraint);
      });
    });

    const reset = () => {
      if (ball) {
        resetBall(ball, config.ballInitialPosition);
      }
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

