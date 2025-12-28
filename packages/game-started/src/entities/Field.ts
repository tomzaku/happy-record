import * as Three from 'three';
import * as Cannon from 'cannon-es';
import type { GameEntity } from '../types';
import {
  GROUND_WIDTH,
  GROUND_LENGTH,
  GROUND_HEIGHT,
  WALL_WIDTH,
  WALL_HEIGHT,
} from '../constants';
import { convertThreeBoxUnitToCannon } from '../utils/cannon';

const TO_RAD = Math.PI / 180;

function createStaticBox({
  size,
  position,
  rotation = [0, 0, 0],
}: {
  size: number[];
  position: number[];
  rotation?: number[];
}): GameEntity {
  const box = new Three.BoxGeometry(...size);
  const material = new Three.MeshPhongMaterial({
    shininess: 10,
    color: 0x3d4143,
  });
  const mesh = new Three.Mesh(box, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(
    rotation[0] * TO_RAD,
    rotation[1] * TO_RAD,
    rotation[2] * TO_RAD
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const body = new Cannon.Body({
    position: new Cannon.Vec3(...position),
    type: Cannon.Body.STATIC,
    material: new Cannon.Material({
      friction: 0,
      restitution: 0.8,
    }),
    shape: new Cannon.Box(
      new Cannon.Vec3(...convertThreeBoxUnitToCannon(size))
    ),
  });

  return { mesh, body };
}

export function createField(): {
  ground: GameEntity;
  walls: GameEntity[];
  floor: { mesh: Three.Mesh; body: Cannon.Body };
} {
  const ground = createStaticBox({
    size: [GROUND_WIDTH, GROUND_HEIGHT, GROUND_LENGTH],
    position: [0, GROUND_HEIGHT / 2, 0],
  });

  const rightWall = createStaticBox({
    size: [WALL_WIDTH, WALL_HEIGHT, GROUND_LENGTH],
    position: [GROUND_WIDTH / 2 - WALL_WIDTH / 2, GROUND_HEIGHT + WALL_HEIGHT / 2, 0],
  });

  const leftWall = createStaticBox({
    size: [WALL_WIDTH, WALL_HEIGHT, GROUND_LENGTH],
    position: [-(GROUND_WIDTH / 2 - WALL_WIDTH / 2), GROUND_HEIGHT + WALL_HEIGHT / 2, 0],
  });

  const topLeftWall = createStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      -GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      -(GROUND_LENGTH / 2 - WALL_WIDTH / 2),
    ],
  });

  const topRightWall = createStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      -(GROUND_LENGTH / 2 - WALL_WIDTH / 2),
    ],
  });

  const bottomRightWall = createStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      GROUND_LENGTH / 2 - WALL_WIDTH / 2,
    ],
  });

  const bottomLeftWall = createStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      -GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      GROUND_LENGTH / 2 - WALL_WIDTH / 2,
    ],
  });

  // Floor (large plane for shadows)
  const floorGeometry = new Three.PlaneGeometry(100, 100, 1, 1);
  floorGeometry.rotateX(-Math.PI / 2);
  const floorMaterial = new Three.MeshLambertMaterial({ color: 0x777777 });
  const floorMesh = new Three.Mesh(floorGeometry, floorMaterial);
  floorMesh.receiveShadow = true;

  const floorShape = new Cannon.Plane();
  const floorBody = new Cannon.Body({ mass: 0 });
  floorBody.addShape(floorShape);
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

  return {
    ground,
    walls: [rightWall, leftWall, topLeftWall, topRightWall, bottomLeftWall, bottomRightWall],
    floor: { mesh: floorMesh, body: floorBody },
  };
}

