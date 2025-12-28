import * as Three from 'three';
import * as Cannon from 'cannon-es';
import type { GameEntity, PlayerRow } from '../types';
import {
  GROUND_WIDTH,
  GROUND_HEIGHT,
  SOCCER_MAN_WIDTH,
  SOCCER_MAN_HEIGHT,
  BALL_SIZE,
  HANDLER_WIDTH,
  HANDLER_HEIGHT,
  HANDLER_BUFFER_ROW,
} from '../constants';
import { convertThreeBoxUnitToCannon } from '../utils/cannon';
import { sum, interleaveArrays, groupOfItems } from '../utils';
import { basicTexture } from '../utils/texture';

export function createPlayerRow({
  numberOfMan,
  z,
  teamColor = '#027902',
}: {
  numberOfMan: number;
  z: number;
  teamColor?: string;
}): PlayerRow {
  const men: GameEntity[] = [];
  const handlers: GameEntity[] = [];

  const numberOfHandlers = numberOfMan + 1;
  const handlerWidths = new Array(numberOfHandlers)
    .fill(0)
    .map(
      (_, i) =>
        (GROUND_WIDTH - SOCCER_MAN_WIDTH * numberOfMan) / numberOfHandlers +
        (i === 0 || i === numberOfHandlers - 1 ? HANDLER_BUFFER_ROW : 0)
    );

  // Create handlers
  for (let i = 0; i < numberOfHandlers; i++) {
    const x =
      -GROUND_WIDTH / 2 -
      HANDLER_BUFFER_ROW +
      SOCCER_MAN_WIDTH * i +
      sum(handlerWidths.slice(0, i)) +
      handlerWidths[i] / 2;

    const handlerConfig = {
      size: [handlerWidths[i], HANDLER_WIDTH, HANDLER_HEIGHT],
      position: [x, GROUND_HEIGHT + SOCCER_MAN_HEIGHT / 2 + BALL_SIZE / 2, z],
    };

    const geometry = new Three.BoxGeometry(...handlerConfig.size);
    const mesh = new Three.Mesh(
      geometry,
      new Three.MeshBasicMaterial({ color: 0x3d4143 })
    );

    const body = new Cannon.Body({
      shape: new Cannon.Box(
        new Cannon.Vec3(...convertThreeBoxUnitToCannon(handlerConfig.size))
      ),
      position: new Cannon.Vec3(...handlerConfig.position),
      type: Cannon.Body.STATIC,
    });

    handlers.push({ mesh, body });
  }

  // Create players (men)
  for (let i = 0; i < numberOfMan; i++) {
    const x =
      -GROUND_WIDTH / 2 -
      HANDLER_BUFFER_ROW +
      SOCCER_MAN_WIDTH * i +
      sum(handlerWidths.slice(0, i + 1)) +
      SOCCER_MAN_WIDTH / 2;

    const manConfig = {
      size: [SOCCER_MAN_WIDTH, SOCCER_MAN_HEIGHT, SOCCER_MAN_WIDTH],
      position: [x, GROUND_HEIGHT + SOCCER_MAN_HEIGHT / 2 + BALL_SIZE / 2, z],
    };

    const geometry = new Three.BoxGeometry(...manConfig.size);
    const mesh = new Three.Mesh(
      geometry,
      new Three.MeshPhongMaterial({
        shininess: 10,
        map: basicTexture(teamColor),
        name: 'box',
      })
    );

    const body = new Cannon.Body({
      shape: new Cannon.Box(
        new Cannon.Vec3(...convertThreeBoxUnitToCannon(manConfig.size))
      ),
      mass: 0.01,
      material: new Cannon.Material({
        friction: 0,
        restitution: 0.5,
      }),
      position: new Cannon.Vec3(...manConfig.position),
    });

    mesh.userData.body = body;
    men.push({ mesh, body });
  }

  // Create constraints between handlers and men
  const combineHandlerAndMan = interleaveArrays(handlers, men);
  const combineHandlerAndManGroupByTwo = groupOfItems({
    arr: combineHandlerAndMan,
    step: 1,
    numberItemOfGroup: 2,
  });

  const constraints = combineHandlerAndManGroupByTwo.map(
    ([object1, object2]) => {
      return new Cannon.LockConstraint(object1.body, object2.body);
    }
  );

  return {
    handlers,
    men,
    constraints,
  };
}

