import React from 'react';

// 3D Library
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as Three from 'three';
import * as Cannon from 'cannon-es';

// Constants
import {
  GROUND_WIDTH,
  GROUND_LENGTH,
  WALL_WIDTH,
  WALL_HEIGHT,
  SOCCER_MAN_WIDTH,
  SOCCER_MAN_HEIGHT,
  BALL_SIZE,
  GROUND_HEIGHT,
  HANDLER_WIDTH,
  HANDLER_HEIGHT,
  HANDLER_GOAL_KEEPER_BUFFER,
  HANDLER_BUFFER_ROW,
  HANDLER_SPACE,
} from './constants';

// Utils
import {
  convertThreeBoxUnitToCannon,
  convertCannonPositionToThree,
  convertCannonQuaternionToThree,
} from './cannon';
import { sum, interleaveArrays, groupOfItems, random } from './utils';

const handlerZIndex = Array(8)
  .fill(0)
  .map((_, i) => {
    return (
      GROUND_LENGTH / 2 -
      WALL_WIDTH -
      HANDLER_GOAL_KEEPER_BUFFER -
      i * HANDLER_SPACE
    );
  });

function basicTexture(color = '#027902') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);
  }

  const tx = new Three.Texture(canvas);
  tx.needsUpdate = true;
  return tx;
}

const TO_RAD = 0.0174532925199432957;

function getStaticBox({
  size,
  position,
  rotation = [0, 0, 0],
}: {
  size: number[];
  position: number[];
  rotation?: number[];
}) {
  let box = new Three.BoxGeometry(...size);
  let ground = new Three.MeshPhongMaterial({
    shininess: 10,
    color: 0x3d4143,
  });
  const mesh = new Three.Mesh(box, ground);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(
    rotation[0] * TO_RAD,
    rotation[1] * TO_RAD,
    rotation[2] * TO_RAD
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return {
    mesh,
    body: new Cannon.Body({
      position: new Cannon.Vec3(...position),
      type: Cannon.Body.STATIC, // can also be achieved by setting the mass to 0
      material: new Cannon.Material({
        friction: 0,
        restitution: 0.8,
      }),
      shape: new Cannon.Box(
        new Cannon.Vec3(...convertThreeBoxUnitToCannon(size))
      ),
    }),
  };
}

const getMenAndHandlers = ({
  numberOfMan,
  z,
  manMap = basicTexture(),
}: {
  numberOfMan: number;
  z: number;
  manMap?: Three.Texture;
}) => {
  let men = [];
  let handlers = [];

  const numberOfHandlers = numberOfMan + 1;
  const handlerWidths = Array(numberOfHandlers)
    .fill(0)
    .map(
      (_, i) =>
        (GROUND_WIDTH - SOCCER_MAN_WIDTH * numberOfMan) / numberOfHandlers +
        (i == 0 || i === numberOfHandlers - 1 ? HANDLER_BUFFER_ROW : 0)
    );

  // Handler
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
    handlers.push({
      mesh: new Three.Mesh(
        geometry,
        new Three.MeshBasicMaterial({ color: 0x3d4143 })
      ),
      body: new Cannon.Body({
        shape: new Cannon.Box(
          new Cannon.Vec3(...convertThreeBoxUnitToCannon(handlerConfig.size))
        ),
        position: new Cannon.Vec3(...handlerConfig.position),
        // mass: 0.01,
        type: Cannon.Body.STATIC,
      }),
    });
  }

  // Men
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
        map: manMap,
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
    men.push({
      mesh,
      body,
    });
  }

  // Constraint
  const combineHandlerAndMan = interleaveArrays(handlers, men);
  const combineHandlerAndManGroupByTwo = groupOfItems({
    arr: combineHandlerAndMan,
    step: 1,
    numberItemOfGroup: 2,
  });
  const contraints = combineHandlerAndManGroupByTwo.map(
    ([object1, object2]) => {
      return new Cannon.LockConstraint(object1.body, object2.body);
    }
  );
  return {
    handlers,
    men,
    contraints,
  };
};

const getGroundAndWalls = () => {
  const ground = getStaticBox({
    size: [GROUND_WIDTH, GROUND_HEIGHT, GROUND_LENGTH],
    position: [0, GROUND_HEIGHT / 2, 0],
  });

  const rightWall = getStaticBox({
    size: [WALL_WIDTH, WALL_HEIGHT, GROUND_LENGTH],
    position: [
      GROUND_WIDTH / 2 - WALL_WIDTH / 2,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      0,
    ],
  });

  const leftWall = getStaticBox({
    size: [WALL_WIDTH, WALL_HEIGHT, GROUND_LENGTH],
    position: [
      -(GROUND_WIDTH / 2 - WALL_WIDTH / 2),
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      0,
    ],
  });

  const topLeftWall = getStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      -GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      -(GROUND_LENGTH / 2 - WALL_WIDTH / 2),
    ],
  });
  const topRightWall = getStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      -(GROUND_LENGTH / 2 - WALL_WIDTH / 2),
    ],
  });

  const bottomRightWall = getStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      GROUND_LENGTH / 2 - WALL_WIDTH / 2,
    ],
  });
  const bottomLeftWall = getStaticBox({
    size: [GROUND_WIDTH / 3, WALL_HEIGHT, WALL_WIDTH],
    position: [
      -GROUND_WIDTH / 3,
      GROUND_HEIGHT + WALL_HEIGHT / 2,
      GROUND_LENGTH / 2 - WALL_WIDTH / 2,
    ],
  });
  return {
    ground,
    rightWall,
    leftWall,
    topLeftWall,
    topRightWall,
    bottomLeftWall,
    bottomRightWall,
  };
};

const GameStarted = () => {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const ballMesh = React.useRef<Three.Mesh>();
  const ballBody = React.useRef<Cannon.Body>();

  const greenMenRef = React.useRef<{ mesh: Three.Mesh; body: Cannon.Body }[]>(
    []
  );
  const greenHandlersRef = React.useRef<
    { mesh: Three.Mesh; body: Cannon.Body }[]
  >([]);

  const redMenRef = React.useRef<{ mesh: Three.Mesh; body: Cannon.Body }[]>([]);
  const redHandlersRef = React.useRef<
    { mesh: Three.Mesh; body: Cannon.Body }[]
  >([]);

  React.useEffect(() => {
    if (!canvas.current) return;
    const world = new Cannon.World({
      gravity: new Cannon.Vec3(0, -9.82, 0), // m/s²
    });
    const scene = new Three.Scene();
    const renderer = new Three.WebGLRenderer({
      canvas: canvas.current,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = Three.PCFSoftShadowMap;

    // Lights
    const ambientLight = new Three.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const spotlight = new Three.SpotLight(0xffffff, 0.7, 0, Math.PI / 4, 1);
    spotlight.position.set(10, 30, 20);
    spotlight.target.position.set(0, 0, 0);

    spotlight.castShadow = true;

    spotlight.shadow.camera.near = 20;
    spotlight.shadow.camera.far = 50;
    spotlight.shadow.camera.fov = 40;

    spotlight.shadow.bias = -0.001;
    spotlight.shadow.mapSize.width = 2048;
    spotlight.shadow.mapSize.height = 2048;

    scene.add(spotlight);

    // Camera
    const camera = new Three.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.5,
      1000
    );
    camera.position.set(0, 2, 1);
    const controls = new OrbitControls(camera, canvas.current);
    controls.update();

    // Fllor
    const floorGeometry = new Three.PlaneGeometry(100, 100, 1, 1);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMaterial = new Three.MeshLambertMaterial({ color: 0x777777 });
    const floor = new Three.Mesh(floorGeometry, floorMaterial);
    floor.receiveShadow = true;
    scene.add(floor);
    const floorShape = new Cannon.Plane();
    const floorBody = new Cannon.Body({ mass: 0 });
    floorBody.addShape(floorShape);
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    const {
      ground,
      rightWall,
      leftWall,
      topLeftWall,
      topRightWall,
      bottomLeftWall,
      bottomRightWall,
    } = getGroundAndWalls();
    scene.add(ground.mesh);
    world.addBody(ground.body);
    scene.add(rightWall.mesh);
    world.addBody(rightWall.body);
    scene.add(leftWall.mesh);
    world.addBody(leftWall.body);
    scene.add(topLeftWall.mesh);
    world.addBody(topLeftWall.body);
    scene.add(topRightWall.mesh);
    world.addBody(topRightWall.body);
    scene.add(bottomLeftWall.mesh);
    world.addBody(bottomLeftWall.body);
    scene.add(bottomRightWall.mesh);
    world.addBody(bottomRightWall.body);

    // Ball
    ballMesh.current = new Three.Mesh(
      new Three.SphereGeometry(BALL_SIZE),
      new Three.MeshNormalMaterial()
    );
    scene.add(ballMesh.current);
    ballBody.current = new Cannon.Body({
      mass: 0.02,
      shape: new Cannon.Sphere(BALL_SIZE),
      position: new Cannon.Vec3(0, 0.2, 0),
      material: new Cannon.Material({
        friction: 0,
        restitution: 0.7,
      }),
    });
    world.addBody(ballBody.current);
    const initialVelocity = new Cannon.Vec3(
      random({ min: -1, max: 1 }),
      0,
      random({ min: -1, max: 1 })
    ); // The velocity is in m/s
    ballBody.current.velocity.copy(initialVelocity);

    const greenMan = [
      {
        numberOfMan: 1,
        z: handlerZIndex[0],
      },
      {
        numberOfMan: 2,
        z: handlerZIndex[1],
      },
      {
        numberOfMan: 5,
        z: handlerZIndex[3],
      },
      {
        numberOfMan: 3,
        z: handlerZIndex[5],
      },
    ];
    greenMan.forEach(({ numberOfMan, z }) => {
      const { handlers, men, contraints } = getMenAndHandlers({
        numberOfMan,
        z,
      });
      greenMenRef.current.push(...men);
      greenHandlersRef.current.push(...handlers);

      handlers.forEach(handler => {
        world.addBody(handler.body);
        scene.add(handler.mesh);
      });
      men.forEach(man => {
        world.addBody(man.body);
        scene.add(man.mesh);
      });
      contraints.forEach(constraint => {
        world.addConstraint(constraint);
      });
    });

    const redMan = [
      {
        numberOfMan: 1,
        z: handlerZIndex[7],
      },
      {
        numberOfMan: 2,
        z: handlerZIndex[6],
      },
      {
        numberOfMan: 5,
        z: handlerZIndex[4],
      },
      {
        numberOfMan: 3,
        z: handlerZIndex[2],
      },
    ];
    redMan.forEach(({ numberOfMan, z }) => {
      const { handlers, men, contraints } = getMenAndHandlers({
        numberOfMan,
        z,
        manMap: basicTexture('#960000'),
      });
      redMenRef.current.push(...men);
      redHandlersRef.current.push(...handlers);

      handlers.forEach(handler => {
        world.addBody(handler.body);
        scene.add(handler.mesh);
      });
      men.forEach(man => {
        world.addBody(man.body);
        scene.add(man.mesh);
      });
      contraints.forEach(constraint => {
        world.addConstraint(constraint);
      });
    });
    animate();

    function animate() {
      if (
        ballBody.current?.position.z &&
        ballBody.current?.position.z > GROUND_LENGTH / 2
      ) {
        console.log('RED WIN');
      }
      if (
        ballBody.current?.position.z &&
        ballBody.current?.position.z < -GROUND_LENGTH / 2
      ) {
        console.log('GREEN WIN');
      }
      requestAnimationFrame(animate);
      ballMesh.current?.position.copy(
        convertCannonPositionToThree(ballBody.current?.position)
      );
      ballMesh.current?.quaternion.copy(
        convertCannonQuaternionToThree(ballBody.current?.quaternion)
      );

      greenHandlersRef.current?.forEach(handler => {
        handler.mesh.position.copy(
          convertCannonPositionToThree(handler.body.position)
        );
        handler.mesh.quaternion.copy(
          convertCannonQuaternionToThree(handler.body.quaternion)
        );
      });
      greenMenRef.current?.forEach(man => {
        man.mesh.position.copy(convertCannonPositionToThree(man.body.position));
        man.mesh.quaternion.copy(
          convertCannonQuaternionToThree(man.body.quaternion)
        );
      });
      redHandlersRef.current?.forEach(handler => {
        handler.mesh.position.copy(
          convertCannonPositionToThree(handler.body.position)
        );
        handler.mesh.quaternion.copy(
          convertCannonQuaternionToThree(handler.body.quaternion)
        );
      });
      redMenRef.current?.forEach(man => {
        man.mesh.position.copy(convertCannonPositionToThree(man.body.position));
        man.mesh.quaternion.copy(
          convertCannonQuaternionToThree(man.body.quaternion)
        );
      });
      renderer.render(scene, camera);

      // Run the simulation independently of framerate every 1 / 60 ms
      world.step(1 / 60);
    }
    // Start the simulation loop
  }, []);
  const onKeyDown = (event: WindowEventMap['keydown']) => {
    switch (event.key) {
      case 'ArrowLeft': {
        const delta = new Cannon.Vec3(-0.01, 0, 0);
        greenHandlersRef.current?.forEach(handler => {
          handler.body.position.vadd(delta, handler.body.position);
        });
        greenMenRef.current?.forEach(men => {
          men.body.position.vadd(delta, men.body.position);
        });
        break;
      }
      case 'ArrowRight': {
        const delta = new Cannon.Vec3(0.01, 0, 0);
        greenHandlersRef.current?.forEach(handler => {
          handler.body.position.vadd(delta, handler.body.position);
        });
        greenMenRef.current?.forEach(men => {
          men.body.position.vadd(delta, men.body.position);
        });
        break;
      }
      case 'a': {
        const delta = new Cannon.Vec3(-0.01, 0, 0);
        redHandlersRef.current?.forEach(handler => {
          handler.body.position.vadd(delta, handler.body.position);
        });
        redMenRef.current?.forEach(men => {
          men.body.position.vadd(delta, men.body.position);
        });
        break;
      }
      case 'd': {
        const delta = new Cannon.Vec3(0.01, 0, 0);
        redHandlersRef.current?.forEach(handler => {
          handler.body.position.vadd(delta, handler.body.position);
        });
        redMenRef.current?.forEach(men => {
          men.body.position.vadd(delta, men.body.position);
        });
        break;
      }
      case ',': {
        greenMenRef.current?.forEach(man => {
          man.body.quaternion.setFromAxisAngle(
            new Cannon.Vec3(1, 0, 0),
            Math.PI / 3
          );
        });
        break;
      }
      case '.': {
        greenMenRef.current?.forEach(man => {
          man.body.quaternion.setFromAxisAngle(
            new Cannon.Vec3(1, 0, 0),
            -Math.PI / 3
          );
        });
        break;
      }
      case 'h': {
        redMenRef.current?.forEach(man => {
          const angle = man.body.quaternion.toAxisAngle()[1] || 0;
          console.log('>Angle', angle, Math.PI);
          if (angle > Math.PI) return;

          man.body.quaternion.setFromAxisAngle(
            new Cannon.Vec3(1, 0, 0),
            -Math.PI / 3
          );
        });
        break;
      }
      case 'j': {
        redMenRef.current?.forEach(man => {
          const angle = man.body.quaternion.toAxisAngle()[1] || 0;
          console.log('>Angle', angle, Math.PI);
          if (angle > Math.PI) return;

          man.body.quaternion.setFromAxisAngle(
            new Cannon.Vec3(1, 0, 0),
            Math.PI / 3
          );
        });
        break;
      }
    }
  };
  React.useEffect(() => {
    // Set up event listeners for keyboard events
    window.addEventListener('keydown', onKeyDown);
    // window.addEventListener('keyup', onKeyUp);

    // Clean up event listeners when component unmounts
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      // window.removeEventListener('keyup', onKeyUp);
    };
  });
  return (
    <div>
      <canvas
        ref={canvas}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default GameStarted;
