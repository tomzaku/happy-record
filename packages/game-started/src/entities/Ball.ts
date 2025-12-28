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
  }

  return { mesh, body };
}

