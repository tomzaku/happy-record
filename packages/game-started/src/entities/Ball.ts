import * as Three from 'three';
import * as Cannon from 'cannon-es';
import type { GameEntity } from '../types';
import { BALL_SIZE } from '../constants';
import { random } from '../utils';

export function createBall(
  position: [number, number, number] = [0, 0.2, 0],
  randomizeVelocity = true
): GameEntity {
  const mesh = new Three.Mesh(
    new Three.SphereGeometry(BALL_SIZE),
    new Three.MeshNormalMaterial()
  );

  const body = new Cannon.Body({
    mass: 0.02,
    shape: new Cannon.Sphere(BALL_SIZE),
    position: new Cannon.Vec3(...position),
    material: new Cannon.Material({
      friction: 0,
      restitution: 0.7,
    }),
  });

  if (randomizeVelocity) {
    const initialVelocity = new Cannon.Vec3(
      random({ min: -1, max: 1 }),
      0,
      random({ min: -1, max: 1 })
    );
    body.velocity.copy(initialVelocity);
  } else {
    // Keep ball stationary initially
    body.velocity.set(0, 0, 0);
    body.type = Cannon.Body.KINEMATIC; // Make it kinematic so it doesn't fall
  }

  return { mesh, body };
}

export function startBall(ball: GameEntity): void {
  ball.body.type = Cannon.Body.DYNAMIC;
  const initialVelocity = new Cannon.Vec3(
    random({ min: -1, max: 1 }),
    0,
    random({ min: -1, max: 1 })
  );
  ball.body.velocity.copy(initialVelocity);
}

export function resetBall(ball: GameEntity, position: [number, number, number] = [0, 0.2, 0]): void {
  ball.body.position.set(...position);
  ball.body.velocity.set(0, 0, 0);
  ball.body.angularVelocity.set(0, 0, 0);
  ball.body.type = Cannon.Body.KINEMATIC;
}

