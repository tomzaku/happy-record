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

  // Create players (men) with two legs
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

    // Create a group for the player (body + legs + feet)
    const playerGroup = new Three.Group();

    // Calculate positions relative to group center
    // Group center is at: GROUND_HEIGHT + SOCCER_MAN_HEIGHT / 2 + BALL_SIZE / 2
    const groupCenterY = GROUND_HEIGHT + SOCCER_MAN_HEIGHT / 2 + BALL_SIZE / 2;
    const groundSurfaceY = GROUND_HEIGHT;
    const distanceFromGroupCenterToGround = groupCenterY - groundSurfaceY;

    // Body/torso (upper part)
    const bodyHeight = SOCCER_MAN_HEIGHT * 0.5;
    const bodyGeometry = new Three.BoxGeometry(
      SOCCER_MAN_WIDTH * 0.7,
      bodyHeight,
      SOCCER_MAN_WIDTH * 0.6
    );
    const bodyMaterial = new Three.MeshPhongMaterial({
      shininess: 10,
      map: basicTexture(teamColor),
      name: 'body',
    });
    const bodyMesh = new Three.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = bodyHeight / 2 + SOCCER_MAN_HEIGHT * 0.15;
    bodyMesh.castShadow = true;
    playerGroup.add(bodyMesh);

    // Leg dimensions
    const legWidth = SOCCER_MAN_WIDTH * 0.2;
    const legHeight = distanceFromGroupCenterToGround + SOCCER_MAN_HEIGHT * 0.1;
    const legDepth = SOCCER_MAN_WIDTH * 0.4;
    const legMaterial = new Three.MeshPhongMaterial({
      shininess: 10,
      map: basicTexture(teamColor),
      name: 'leg',
    });

    // Left leg
    const leftLegGeometry = new Three.BoxGeometry(legWidth, legHeight, legDepth);
    const leftLegMesh = new Three.Mesh(leftLegGeometry, legMaterial);
    // Position leg so bottom touches ground: legCenterY = -distanceFromGroupCenterToGround + legHeight/2
    leftLegMesh.position.set(
      -SOCCER_MAN_WIDTH * 0.15,
      -distanceFromGroupCenterToGround + legHeight / 2,
      0
    );
    leftLegMesh.castShadow = true;
    playerGroup.add(leftLegMesh);

    // Right leg
    const rightLegMesh = new Three.Mesh(leftLegGeometry.clone(), legMaterial);
    rightLegMesh.position.set(
      SOCCER_MAN_WIDTH * 0.15,
      -distanceFromGroupCenterToGround + legHeight / 2,
      0
    );
    rightLegMesh.castShadow = true;
    playerGroup.add(rightLegMesh);

    // Feet (wider for easier ball contact)
    const footWidth = SOCCER_MAN_WIDTH * 0.6; // Much wider than leg
    const footHeight = SOCCER_MAN_HEIGHT * 0.08;
    const footDepth = SOCCER_MAN_WIDTH * 0.7; // Wider than leg for better ball contact
    const footMaterial = new Three.MeshPhongMaterial({
      shininess: 10,
      map: basicTexture(teamColor),
      name: 'foot',
    });

    // Left foot
    const leftFootGeometry = new Three.BoxGeometry(footWidth, footHeight, footDepth);
    const leftFootMesh = new Three.Mesh(leftFootGeometry, footMaterial);
    leftFootMesh.position.set(
      -SOCCER_MAN_WIDTH * 0.15,
      -distanceFromGroupCenterToGround - footHeight / 2,
      0
    );
    leftFootMesh.castShadow = true;
    playerGroup.add(leftFootMesh);

    // Right foot
    const rightFootMesh = new Three.Mesh(leftFootGeometry.clone(), footMaterial);
    rightFootMesh.position.set(
      SOCCER_MAN_WIDTH * 0.15,
      -distanceFromGroupCenterToGround - footHeight / 2,
      0
    );
    rightFootMesh.castShadow = true;
    playerGroup.add(rightFootMesh);

    // Position the entire group
    playerGroup.position.set(...manConfig.position);

    // Physics body (single box for simplicity, matches overall player size)
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

    playerGroup.userData.body = body;
    men.push({ mesh: playerGroup, body });
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

